import fs from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as docx from 'docx';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { BaseConverter } from './base.js';

export type DocumentOperation =
  | 'docx-to-pdf'
  | 'pdf-to-docx'
  | 'txt-to-pdf'
  | 'csv-to-xlsx'
  | 'xlsx-to-csv';

function wrapLines(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  for (const para of text.split(/\r?\n/)) {
    if (!para) {
      lines.push('');
      continue;
    }
    let cur = '';
    for (const word of para.split(/\s+/)) {
      if ((cur + ' ' + word).trim().length > maxChars) {
        lines.push(cur.trim());
        cur = word;
      } else {
        cur = (cur + ' ' + word).trim();
      }
    }
    if (cur) lines.push(cur);
  }
  return lines;
}

async function textToPdfBuffer(title: string, text: string): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page = doc.addPage([595, 842]);
  const { height } = page.getSize();
  let y = height - 60;
  if (title) {
    page.drawText(title.slice(0, 120), { x: 50, y, size: 16, font: bold, color: rgb(0.1, 0.1, 0.1) });
    y -= 28;
  }
  for (const line of wrapLines(text, 95)) {
    if (y < 50) {
      page = doc.addPage([595, 842]);
      y = 792;
    }
    page.drawText(line || ' ', { x: 50, y, size: 10, font, color: rgb(0.15, 0.15, 0.15) });
    y -= 14;
  }
  return Buffer.from(await doc.save({ useObjectStreams: false }));
}

export class DocumentConverter extends BaseConverter<{ operation: DocumentOperation; sheetName?: string }> {
  name = 'document';

  async convert(
    input: string[],
    options: { operation: DocumentOperation; sheetName?: string },
    onProgress?: (p: number) => void
  ): Promise<string[]> {
    const src = input[0];
    await this.assertExists(src);
    onProgress?.(15);
    const op = options.operation;

    if (op === 'txt-to-pdf') {
      const text = await fs.readFile(src, 'utf8');
      if (text.length > 5_000_000) throw new Error('Text file too large');
      const pdf = await textToPdfBuffer(path.basename(src), text);
      const out = await this.tmpOutput('.pdf');
      await fs.writeFile(out, pdf);
      onProgress?.(100);
      return [out];
    }

    if (op === 'docx-to-pdf') {
      // Try LibreOffice for pixel-perfect conversion if configured; else text-preserving fallback.
      const libre = process.env.LIBREOFFICE_PATH;
      if (libre) {
        const { execFile } = await import('node:child_process');
        const { promisify } = await import('node:util');
        const os = await import('node:os');
        const run = promisify(execFile);
        const outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tv-docx-'));
        await run(libre, ['--headless', '--convert-to', 'pdf', '--outdir', outDir, src], { timeout: 120_000 });
        const files = await fs.readdir(outDir);
        const pdfFile = files.find((f) => f.toLowerCase().endsWith('.pdf'));
        if (!pdfFile) throw new Error('LibreOffice conversion failed');
        const out = await this.tmpOutput('.pdf');
        await fs.copyFile(path.join(outDir, pdfFile), out);
        onProgress?.(100);
        return [out];
      }
      const { value: text } = await mammoth.extractRawText({ path: src });
      const pdf = await textToPdfBuffer(path.basename(src), text || '(empty document)');
      const out = await this.tmpOutput('.pdf');
      await fs.writeFile(out, pdf);
      onProgress?.(100);
      return [out];
    }

    if (op === 'pdf-to-docx') {
      const { extractPdfText } = await import('../../utils/pdfText.js');
      const data = await fs.readFile(src);
      const parsed = await extractPdfText(data);
      const text: string = parsed?.text ?? '';
      const paragraphs = text.split(/\n{2,}|\r?\n/).map((t: string) => t.trim()).filter(Boolean).slice(0, 5000);
      const children = (paragraphs.length ? paragraphs : ['(no extractable text)']).map(
        (t) => new docx.Paragraph({ children: [new docx.TextRun(t.slice(0, 2000))] })
      );
      const d = new docx.Document({ sections: [{ children }] });
      const buf = await docx.Packer.toBuffer(d);
      const out = await this.tmpOutput('.docx');
      await fs.writeFile(out, buf);
      onProgress?.(100);
      return [out];
    }

    if (op === 'csv-to-xlsx') {
      const wb = XLSX.readFile(src);
      // csv read gives one sheet; normalize name
      const out = await this.tmpOutput('.xlsx');
      XLSX.writeFile(wb, out, { bookType: 'xlsx' });
      onProgress?.(100);
      return [out];
    }

    if (op === 'xlsx-to-csv') {
      const wb = XLSX.readFile(src);
      const sheetName = options.sheetName ?? wb.SheetNames[0];
      if (!sheetName) throw new Error('Workbook has no sheets');
      const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sheetName]);
      const out = await this.tmpOutput('.csv');
      await fs.writeFile(out, csv, 'utf8');
      onProgress?.(100);
      return [out];
    }

    throw new Error(`Unsupported document operation: ${op}`);
  }
}
