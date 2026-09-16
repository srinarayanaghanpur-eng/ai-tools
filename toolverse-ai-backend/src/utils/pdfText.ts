import { dynamicImport } from './dynamicImport.js';

/**
 * Real PDF text extraction using modern pdf.js (pdfjs-dist v4).
 * Handles object streams + pdf-lib generated files (pdf-parse 1.x fails on both).
 * Falls back to pdf-parse for legacy PDFs if pdf.js fails.
 */
export async function extractPdfText(buffer: Buffer): Promise<{ text: string; numpages?: number; info?: any }> {
  // Primary: pdf.js v4 (no canvas needed for text extraction)
  try {
    const pdfjs: any = await dynamicImport('pdfjs-dist/legacy/build/pdf.mjs');
    const data = new Uint8Array(buffer);
    const loadingTask = pdfjs.getDocument({ data, useSystemFonts: true, disableFontFace: true });
    const doc = await loadingTask.promise;
    const numpages = doc.numPages;
    let text = '';
    const maxPages = Math.min(numpages, 200);
    for (let i = 1; i <= maxPages; i++) {
      const page = await doc.getPage(i);
      const tc = await page.getTextContent();
      const strs = (tc.items ?? []).map((it: any) => it?.str ?? '').join(' ');
      text += strs + '\n';
      // cleanup page resources
      try {
        await page.cleanup();
      } catch { /* ignore */ }
    }
    try {
      await doc.destroy();
    } catch { /* ignore */ }
    return { text, numpages };
  } catch (e) {
    // Fallback: legacy pdf-parse (handles some scanned/odd PDFs differently)
    try {
      const pdfParse = (await dynamicImport('pdf-parse')).default as any;
      const parsed = await pdfParse(buffer);
      return { text: parsed?.text ?? '', numpages: parsed?.numpages, info: parsed?.info };
    } catch {
      throw e;
    }
  }
}
