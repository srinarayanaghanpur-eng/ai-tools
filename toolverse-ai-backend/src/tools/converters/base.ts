import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

/**
 * Reusable converter architecture. New converters extend BaseConverter
 * and are registered in the tool registry — routes never hardcode converters.
 *
 *   Converter
 *   ├── PDF
 *   ├── Image
 *   ├── Document
 *   ├── Video
 *   └── Audio
 */
export abstract class BaseConverter<TOptions = Record<string, any>> {
  abstract name: string;

  protected async tmpOutput(ext: string): Promise<string> {
    const dir = path.join(os.tmpdir(), 'toolverse-outputs');
    await fs.mkdir(dir, { recursive: true });
    return path.join(dir, `${crypto.randomUUID()}${ext}`);
  }

  protected async assertExists(p: string) {
    try {
      await fs.access(p);
    } catch {
      throw new Error(`Input not found: ${path.basename(p)}`);
    }
  }

  abstract convert(input: string[], options: TOptions, onProgress?: (pct: number) => void): Promise<string[]>;
}
