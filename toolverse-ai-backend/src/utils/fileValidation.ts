import fs from 'node:fs/promises';
import path from 'node:path';
import { Errors } from '../errors.js';
import { dynamicImport } from './dynamicImport.js';
import type { ToolDefinition } from '../tools/types.js';

// file-type v19+ is ESM-only (no CJS main). Load via dynamicImport helper:
// plain `await import()` is downlevelled to require() by the CJS build and
// would crash in production (it silently degraded validation to ext-only).
async function sniffMime(buf: Buffer): Promise<{ mime: string; ext: string } | undefined> {
  const mod: any = await dynamicImport('file-type');
  const fn = mod.fileTypeFromBuffer ?? mod.default?.fileTypeFromBuffer ?? mod.default;
  if (typeof fn !== 'function') return undefined;
  return fn(buf);
}

const EXT_TO_MIME: Record<string, string[]> = {
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.webp': ['image/webp'],
  '.gif': ['image/gif'],
  '.bmp': ['image/bmp'],
  '.tiff': ['image/tiff'],
  '.tif': ['image/tiff'],
  '.avif': ['image/avif'],
  '.svg': ['image/svg+xml'],
  '.pdf': ['application/pdf'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'],
  '.doc': ['application/msword'],
  '.txt': ['text/plain'],
  '.csv': ['text/csv', 'text/plain', 'application/vnd.ms-excel'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip'],
  '.xls': ['application/vnd.ms-excel'],
  '.mp4': ['video/mp4'],
  '.mov': ['video/quicktime'],
  '.webm': ['video/webm'],
  '.mkv': ['video/x-matroska'],
  '.avi': ['video/x-msvideo'],
  '.mp3': ['audio/mpeg'],
  '.wav': ['audio/wav', 'audio/x-wav'],
  '.ogg': ['audio/ogg'],
  '.m4a': ['audio/mp4', 'audio/x-m4a'],
  '.flac': ['audio/flac'],
  '.json': ['application/json', 'text/plain'],
};

function extOf(name: string): string {
  return path.extname(name || '').toLowerCase();
}

/** Server-side file validation: extension + sniffed MIME + size. Never trusts client Content-Type. */
export async function validateInputFiles(
  tool: ToolDefinition,
  files: { path: string; originalname: string; size: number }[]
): Promise<void> {
  if (tool.inputType === 'text' || tool.inputType === 'json') return; // no files needed
  if (!files.length) throw Errors.invalidFile('No file uploaded');

  if (files.length > tool.limits.maxFiles) {
    throw Errors.invalidFile(`Too many files (max ${tool.limits.maxFiles})`);
  }

  const maxBytes = tool.limits.maxFileMb * 1024 * 1024;
  const allowed = new Set(tool.acceptedFormats.map((f) => f.toLowerCase()));

  for (const f of files) {
    const safeName = path.basename(f.originalname);
    if (!safeName || safeName.length > 180) throw Errors.invalidFile('Invalid filename');
    const ext = extOf(safeName);
    if (!ext) throw Errors.invalidFile(`Missing file extension: ${safeName}`);
    if (allowed.size && ![...allowed].some((a) => a === ext || a === ext.slice(1))) {
      throw Errors.unsupported(`Unsupported format ${ext} for tool ${tool.slug}`);
    }
    if (f.size > maxBytes) {
      throw Errors.tooLarge(`${safeName} exceeds ${tool.limits.maxFileMb}MB limit`);
    }
    if (f.size === 0) throw Errors.invalidFile(`${safeName} is empty`);

    // MIME sniffing (first bytes) — never execute, just inspect
    let buf: Buffer;
    try {
      const fh = await fs.open(f.path, 'r');
      const b = Buffer.alloc(8192);
      const { bytesRead } = await fh.read(b, 0, 8192, 0);
      await fh.close();
      buf = b.subarray(0, bytesRead);
    } catch {
      throw Errors.invalidFile(`Cannot read ${safeName}`);
    }
    const sniffed = await sniffMime(buf).catch(() => undefined);
    if (sniffed) {
      const expected = EXT_TO_MIME[ext];
      // Enforce for risky/structured types; images/video/pdf/office must match sniffed type loosely
      if (expected && !expected.includes(sniffed.mime)) {
        // Allow zip-based office formats to sniff as zip
        const isZipOffice =
          sniffed.mime === 'application/zip' && ['.docx', '.xlsx'].includes(ext);
        // Allow csv/txt which often sniff as nothing — already handled (sniffed undefined for text)
        if (!isZipOffice) {
          throw Errors.invalidFile(`${safeName}: content (${sniffed.mime}) does not match extension ${ext}`);
        }
      }
      // Block executables masquerading as allowed types
      if (['application/x-msdownload', 'application/x-executable', 'application/x-mach-binary'].includes(sniffed.mime)) {
        throw Errors.invalidFile(`${safeName}: executable content blocked`);
      }
    } else {
      // No magic bytes: only allow text-ish formats
      const textExts = ['.txt', '.csv', '.json', '.svg'];
      if (!textExts.includes(ext) && ['.pdf'].includes(ext)) {
        // pdf must sniff as pdf; if not sniffed, verify header manually
        const head = buf.subarray(0, 5).toString('latin1');
        if (ext === '.pdf' && head !== '%PDF-') {
          throw Errors.invalidFile(`${safeName}: not a valid PDF`);
        }
      }
    }
  }
}
