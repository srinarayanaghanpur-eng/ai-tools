import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { PdfConverter } from '../../converters/pdf.js';
import { DocumentConverter } from '../../converters/document.js';
import { env } from '../../../config/env.js';
import type { Processor } from '../../types.js';

const runExec = promisify(execFile);
const pdfConv = new PdfConverter();
const docConv = new DocumentConverter();

async function tmpOut(ext: string) {
  const dir = path.join(os.tmpdir(), 'toolverse-outputs');
  await fs.mkdir(dir, { recursive: true });
  return path.join(dir, `${crypto.randomUUID()}${ext}`);
}

export const pdfMerge: Processor = async (ctx) => {
  if (ctx.inputPaths.length < 2) throw new Error('At least 2 PDFs required for merge');
  const paths = await pdfConv.convert(ctx.inputPaths, { operation: 'merge' }, ctx.onProgress);
  return { paths, names: ['merged.pdf'] };
};

export const pdfSplit: Processor = async (ctx) => {
  const paths = await pdfConv.convert(ctx.inputPaths.slice(0, 1), { operation: 'split', pages: ctx.params.pages }, ctx.onProgress);
  return { paths, names: ['split.pdf'] };
};

export const pdfCompress: Processor = async (ctx) => {
  const paths = await pdfConv.convert(ctx.inputPaths.slice(0, 1), { operation: 'compress' }, ctx.onProgress);
  return { paths, names: [withSuffix(ctx.inputNames[0], '-compressed', '.pdf')] };
};

export const pdfRotate: Processor = async (ctx) => {
  const rotation = Number(ctx.params.rotation ?? 90);
  const paths = await pdfConv.convert(ctx.inputPaths.slice(0, 1), { operation: 'rotate', rotation, pages: ctx.params.pages }, ctx.onProgress);
  return { paths, names: [withSuffix(ctx.inputNames[0], '-rotated', '.pdf')] };
};

export const pdfToWord: Processor = async (ctx) => {
  const paths = await docConv.convert(ctx.inputPaths.slice(0, 1), { operation: 'pdf-to-docx' }, ctx.onProgress);
  return { paths, names: [withSuffix(ctx.inputNames[0], '', '.docx')], mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'] };
};

export const pdfTextExtract: Processor = async (ctx) => {
  const { extractPdfText } = await import('../../../utils/pdfText.js');
  const data = await fs.readFile(ctx.inputPaths[0]);
  ctx.onProgress(30);
  const parsed = await extractPdfText(data);
  const text: string = parsed?.text ?? '';
  ctx.onProgress(70);
  const out = await tmpOut('.txt');
  await fs.writeFile(out, text || '(no extractable text found)', 'utf8');
  ctx.onProgress(100);
  return { paths: [out], names: [withSuffix(ctx.inputNames[0], '', '.txt')], mimeTypes: ['text/plain'], meta: { pages: parsed?.numpages, info: parsed?.info } };
};

export const pdfOcr: Processor = async (ctx) => {
  // Real OCR via tesseract.js. For images: direct OCR. For PDFs: born-digital text extraction
  // + OCR of embedded raster is out of scope without poppler; scanned PDFs need pdftoppm.
  const ext = path.extname(ctx.inputNames[0]).toLowerCase();
  if (ext === '.pdf') {
    // Try fast text-layer extraction first (real, not fake)
    try {
      const { extractPdfText } = await import('../../../utils/pdfText.js');
      const data = await fs.readFile(ctx.inputPaths[0]);
      const parsed = await extractPdfText(data);
      const text: string = (parsed?.text ?? '').trim();
      if (text.length >= 20) {
        const out = await tmpOut('.txt');
        await fs.writeFile(out, text, 'utf8');
        ctx.onProgress(100);
        return { paths: [out], names: [withSuffix(ctx.inputNames[0], '-ocr', '.txt')], meta: { method: 'text-layer' } };
      }
    } catch { /* fall through to raster OCR */ }
    // Scanned PDF: needs rasterization
    throw new Error(
      'Scanned PDF OCR requires Poppler (pdftoppm). Install poppler and set POPPLER_BIN_DIR, or upload the page as PNG/JPG for direct OCR.'
    );
  }
  const { dynamicImport } = await import('../../../utils/dynamicImport.js');
  const { createWorker } = await dynamicImport('tesseract.js');
  const lang = String(ctx.params.lang ?? 'eng').slice(0, 12);
  const worker: any = await (createWorker as any)(lang);
  ctx.onProgress(20);
  const { data } = await worker.recognize(ctx.inputPaths[0]);
  await worker.terminate().catch(() => undefined);
  ctx.onProgress(90);
  const out = await tmpOut('.txt');
  await fs.writeFile(out, data?.text ?? '', 'utf8');
  ctx.onProgress(100);
  return { paths: [out], names: [withSuffix(ctx.inputNames[0], '-ocr', '.txt')], meta: { confidence: data?.confidence } };
};

async function findPoppler(): Promise<string> {
  const binDir = env.POPPLER_BIN_DIR;
  const exe = process.platform === 'win32' ? 'pdftoppm.exe' : 'pdftoppm';
  const candidates = [binDir ? path.join(binDir, exe) : null, exe].filter(Boolean) as string[];
  for (const c of candidates) {
    try {
      await runExec(c, ['-h'], { timeout: 5000 });
      return c;
    } catch { /* try next */ }
  }
  throw new Error(
    'PDF rasterization requires Poppler (pdftoppm). Install poppler-utils/poppler and ensure pdftoppm is on PATH or set POPPLER_BIN_DIR.'
  );
}

async function rasterizeFirstPage(src: string, format: 'jpg' | 'png', dpi: number, onProgress: (n: number) => void): Promise<string> {
  const bin = await findPoppler();
  const flag = format === 'png' ? '-png' : '-jpeg';
  const outPrefix = path.join(os.tmpdir(), `tv-pdfraster-${crypto.randomUUID()}`);
  onProgress(20);
  await runExec(bin, [flag, '-r', String(dpi), '-f', '1', '-l', '1', src, outPrefix], { timeout: 120_000 });
  const dir = path.dirname(outPrefix);
  const base = path.basename(outPrefix);
  const files = await fs.readdir(dir);
  const wantExt = format === 'png' ? '.png' : '.jpg';
  const match = files.filter((f) => f.startsWith(base) && f.toLowerCase().endsWith(wantExt)).sort();
  if (!match.length) throw new Error('Rasterization produced no output');
  onProgress(100);
  return path.join(dir, match[0]);
}

export const pdfToJpg: Processor = async (ctx) => {
  // Real rasterization via Poppler pdftoppm. No fake rendering.
  const dpi = Math.max(72, Math.min(300, Number(ctx.params.dpi ?? 150)));
  const out = await rasterizeFirstPage(ctx.inputPaths[0], 'jpg', dpi, ctx.onProgress);
  return { paths: [out], names: [withSuffix(ctx.inputNames[0], '-p1', '.jpg')], mimeTypes: ['image/jpeg'] };
};

export const pdfToPng: Processor = async (ctx) => {
  // Real rasterization via Poppler pdftoppm (PNG preserves sharp text/lines).
  const dpi = Math.max(72, Math.min(300, Number(ctx.params.dpi ?? 150)));
  const out = await rasterizeFirstPage(ctx.inputPaths[0], 'png', dpi, ctx.onProgress);
  return { paths: [out], names: [withSuffix(ctx.inputNames[0], '-p1', '.png')], mimeTypes: ['image/png'] };
};

function withSuffix(original: string, suffix: string, newExt?: string): string {
  const ext = newExt ?? path.extname(original);
  const base = path.basename(original, path.extname(original)).slice(0, 100) || 'output';
  return `${base}${suffix}${ext}`;
}
