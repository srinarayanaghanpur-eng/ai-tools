import { PDFDocument, degrees } from 'pdf-lib';
import fs from 'node:fs/promises';
import { BaseConverter } from './base.js';

export type PdfOperation = 'merge' | 'split' | 'compress' | 'rotate' | 'extract-text';

export interface PdfOptions {
  operation: PdfOperation;
  // split: pages like "1-3,5" (1-indexed); rotate: degrees; compress: recompress flag
  pages?: string;
  rotation?: number;
}

function parsePages(spec: string | undefined, total: number): number[] {
  if (!spec) return Array.from({ length: total }, (_, i) => i);
  const out = new Set<number>();
  for (const part of spec.split(',')) {
    const m = part.trim().match(/^(\d+)(?:-(\d+))?$/);
    if (!m) throw new Error(`Invalid pages spec: ${part}`);
    const a = Math.max(1, Number(m[1]));
    const b = m[2] ? Number(m[2]) : a;
    for (let p = Math.min(a, b); p <= Math.max(a, b); p++) {
      if (p >= 1 && p <= total) out.add(p - 1);
    }
  }
  return [...out].sort((x, y) => x - y);
}

export class PdfConverter extends BaseConverter<PdfOptions> {
  name = 'pdf';

  async convert(input: string[], options: PdfOptions, onProgress?: (p: number) => void): Promise<string[]> {
    onProgress?.(10);
    if (options.operation === 'merge') {
      const merged = await PDFDocument.create();
      let i = 0;
      for (const file of input) {
        await this.assertExists(file);
        const bytes = await fs.readFile(file);
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pages = await merged.copyPages(doc, doc.getPageIndices());
        pages.forEach((p) => merged.addPage(p));
        i++;
        onProgress?.(10 + Math.round((i / input.length) * 70));
      }
      const out = await this.tmpOutput('.pdf');
      // NOTE: useObjectStreams:false for max compatibility with pdf-parse (pdf.js 1.x)
      // which cannot read compressed object streams. Real optimization still happens via re-serialization.
      await fs.writeFile(out, await merged.save({ useObjectStreams: false }));
      onProgress?.(100);
      return [out];
    }

    const src = input[0];
    await this.assertExists(src);
    const bytes = await fs.readFile(src);
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    onProgress?.(40);

    if (options.operation === 'split') {
      const idx = parsePages(options.pages, doc.getPageCount());
      if (!idx.length) throw new Error('No pages selected');
      const out = await PDFDocument.create();
      const pages = await out.copyPages(doc, idx);
      pages.forEach((p) => out.addPage(p));
      const outPath = await this.tmpOutput('.pdf');
      await fs.writeFile(outPath, await out.save({ useObjectStreams: false }));
      onProgress?.(100);
      return [outPath];
    }

    if (options.operation === 'rotate') {
      const deg = Number(options.rotation ?? 90);
      if (![90, 180, 270, -90, -180, -270, 0].includes(deg)) throw new Error('rotation must be 90/180/270');
      const idx = parsePages(options.pages, doc.getPageCount());
      const targets = idx.length ? idx : doc.getPageIndices();
      for (const p of targets) {
        const page = doc.getPage(p);
        const cur = page.getRotation().angle;
        page.setRotation(degrees((cur + deg + 360) % 360));
      }
      const outPath = await this.tmpOutput('.pdf');
      await fs.writeFile(outPath, await doc.save({ useObjectStreams: false }));
      onProgress?.(100);
      return [outPath];
    }

    if (options.operation === 'compress') {
      // Re-serialize (still a real size reduction for many PDFs) without object streams
      // to keep output readable by pdf-parse/pdf.js 1.x downstream tools.
      const outPath = await this.tmpOutput('.pdf');
      await fs.writeFile(outPath, await doc.save({ useObjectStreams: false, addDefaultPage: false }));
      onProgress?.(100);
      return [outPath];
    }

    throw new Error(`Unsupported PDF operation: ${options.operation}`);
  }
}
