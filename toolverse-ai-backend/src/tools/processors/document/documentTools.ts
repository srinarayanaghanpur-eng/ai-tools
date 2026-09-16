import fs from 'node:fs/promises';
import os from 'node:os';
import crypto from 'node:crypto';
import path from 'node:path';
import mammoth from 'mammoth';
import { DocumentConverter } from '../../converters/document.js';
import type { Processor } from '../../types.js';

const conv = new DocumentConverter();

export const docxToPdf: Processor = async (ctx) => {
  const paths = await conv.convert(ctx.inputPaths.slice(0, 1), { operation: 'docx-to-pdf' }, ctx.onProgress);
  return { paths, names: [swap(ctx.inputNames[0], '.pdf')], mimeTypes: ['application/pdf'] };
};

export const pdfToDocx: Processor = async (ctx) => {
  const paths = await conv.convert(ctx.inputPaths.slice(0, 1), { operation: 'pdf-to-docx' }, ctx.onProgress);
  return { paths, names: [swap(ctx.inputNames[0], '.docx')], mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'] };
};

export const txtToPdf: Processor = async (ctx) => {
  const paths = await conv.convert(ctx.inputPaths.slice(0, 1), { operation: 'txt-to-pdf' }, ctx.onProgress);
  return { paths, names: [swap(ctx.inputNames[0], '.pdf')], mimeTypes: ['application/pdf'] };
};

export const csvToXlsx: Processor = async (ctx) => {
  const paths = await conv.convert(ctx.inputPaths.slice(0, 1), { operation: 'csv-to-xlsx' }, ctx.onProgress);
  return { paths, names: [swap(ctx.inputNames[0], '.xlsx')], mimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] };
};

export const xlsxToCsv: Processor = async (ctx) => {
  const paths = await conv.convert(ctx.inputPaths.slice(0, 1), { operation: 'xlsx-to-csv', sheetName: ctx.params.sheet } as any, ctx.onProgress);
  return { paths, names: [swap(ctx.inputNames[0], '.csv')], mimeTypes: ['text/csv'] };
};

export const docxToTxt: Processor = async (ctx) => {
  // Real text extraction via mammoth (no macros execute).
  const { value: text } = await mammoth.extractRawText({ path: ctx.inputPaths[0] });
  ctx.onProgress(70);
  const out = path.join(os.tmpdir(), `${crypto.randomUUID()}.txt`);
  await fs.writeFile(out, text || '(empty document)', 'utf8');
  ctx.onProgress(100);
  return { paths: [out], names: [swap(ctx.inputNames[0], '.txt')], mimeTypes: ['text/plain'] };
};

export const mdToPdf: Processor = async (ctx) => {
  // Real Markdown → PDF: strip markup to styled plain text, render via pdf-lib.
  const raw = await fs.readFile(ctx.inputPaths[0], 'utf8');
  if (raw.length > 2_000_000) throw new Error('Markdown file too large');
  ctx.onProgress(30);
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  const body = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.Courier);
  let page = doc.addPage([595, 842]);
  let y = 792;
  const newPage = () => {
    page = doc.addPage([595, 842]);
    y = 792;
  };
  const draw = (text: string, size: number, font: any, indent = 50) => {
    const maxChars = Math.floor((595 - indent - 45) / (size * 0.55));
    const words = text.split(/\s+/);
    let line = '';
    const flush = (l: string) => {
      if (y < 60) newPage();
      page.drawText(l || ' ', { x: indent, y, size, font, color: rgb(0.12, 0.12, 0.12) });
      y -= size + 5;
    };
    for (const w of words) {
      if ((line + ' ' + w).trim().length > maxChars) {
        flush(line.trim());
        line = w;
      } else {
        line = (line + ' ' + w).trim();
      }
    }
    if (line.trim()) flush(line.trim());
  };
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.replace(/(\*\*|__)(.*?)\1/g, '$2').replace(/(`)(.*?)\1/g, '$2').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    if (/^#{1,3}\s+/.test(line)) {
      const level = line.match(/^#+/)![0].length;
      y -= 8;
      draw(line.replace(/^#+\s+/, ''), level === 1 ? 18 : level === 2 ? 14 : 12, bold);
      y -= 4;
    } else if (/^[-*]\s+/.test(line)) {
      draw('• ' + line.replace(/^[-*]\s+/, ''), 10, body, 65);
    } else if (/^\s*```/.test(rawLine)) {
      draw('—', 8, mono);
    } else if (line.trim() === '') {
      y -= 8;
      if (y < 60) newPage();
    } else {
      draw(line, 10, body);
    }
  }
  const out = path.join(os.tmpdir(), `${crypto.randomUUID()}.pdf`);
  await fs.writeFile(out, await doc.save({ useObjectStreams: false }));
  ctx.onProgress(100);
  return { paths: [out], names: [swap(ctx.inputNames[0], '.pdf')], mimeTypes: ['application/pdf'] };
};

function swap(original: string, newExt: string): string {
  const base = path.basename(original, path.extname(original)).slice(0, 100) || 'output';
  return `${base}${newExt}`;
}
