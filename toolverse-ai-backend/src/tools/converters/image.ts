import sharp from 'sharp';
import path from 'node:path';
import { BaseConverter } from './base.js';

export interface ImageOptions {
  operation: 'compress' | 'resize' | 'convert' | 'remove-background';
  quality?: number;
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  format?: 'jpeg' | 'png' | 'webp';
}

export class ImageConverter extends BaseConverter<ImageOptions> {
  name = 'image';

  async convert(input: string[], options: ImageOptions, onProgress?: (p: number) => void): Promise<string[]> {
    const src = input[0];
    await this.assertExists(src);
    onProgress?.(20);
    let pipeline = sharp(src, { failOnError: false }).rotate(); // auto-orient by EXIF

    if (options.operation === 'resize') {
      if (!options.width && !options.height) throw new Error('width or height required');
      pipeline = pipeline.resize(options.width, options.height, {
        fit: (options.fit as any) ?? 'inside',
        withoutEnlargement: false,
      });
    } else if (options.operation === 'compress') {
      const q = Math.max(1, Math.min(100, options.quality ?? 75));
      const meta = await sharp(src).metadata().catch(() => ({ format: 'jpeg' }) as any);
      const fmt = meta.format;
      if (fmt === 'png') pipeline = pipeline.png({ quality: q, compressionLevel: 9 });
      else if (fmt === 'webp') pipeline = pipeline.webp({ quality: q });
      else pipeline = pipeline.jpeg({ quality: q, mozjpeg: true });
    }

    const targetFormat = options.format
      ?? (options.operation === 'convert'
        ? (path.extname(await this.tmpOutput('.x')).slice(1) as any)
        : undefined);

    let outExt = path.extname(src).toLowerCase();
    if (options.format === 'jpeg') {
      pipeline = pipeline.jpeg({ quality: options.quality ?? 85, mozjpeg: true });
      outExt = '.jpg';
    } else if (options.format === 'png') {
      pipeline = pipeline.png();
      outExt = '.png';
    } else if (options.format === 'webp') {
      pipeline = pipeline.webp({ quality: options.quality ?? 85 });
      outExt = '.webp';
    } else if (targetFormat) {
      void targetFormat;
    }

    const out = await this.tmpOutput(outExt || '.jpg');
    onProgress?.(60);
    await pipeline.toFile(out);
    onProgress?.(100);
    return [out];
  }
}
