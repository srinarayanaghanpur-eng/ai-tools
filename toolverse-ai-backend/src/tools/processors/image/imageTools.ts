import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { ImageConverter } from '../../converters/image.js';
import type { Processor } from '../../types.js';

async function tmpOut(ext: string) {
  const dir = path.join(os.tmpdir(), 'toolverse-outputs');
  await fs.mkdir(dir, { recursive: true });
  return path.join(dir, `${crypto.randomUUID()}${ext}`);
}

const converter = new ImageConverter();

export const imageCompress: Processor = async (ctx) => {
  const quality = Math.max(1, Math.min(100, Number(ctx.params.quality ?? 75)));
  const paths = await converter.convert(ctx.inputPaths.slice(0, 1), { operation: 'compress', quality }, ctx.onProgress);
  return { paths, names: [swapExt(ctx.inputNames[0], '.jpg', paths[0])] };
};

export const imageResize: Processor = async (ctx) => {
  const width = ctx.params.width ? Number(ctx.params.width) : undefined;
  const height = ctx.params.height ? Number(ctx.params.height) : undefined;
  if (!width && !height) throw new Error('width or height required');
  if ((width && (width < 1 || width > 8000)) || (height && (height < 1 || height > 8000))) {
    throw new Error('dimensions must be 1..8000');
  }
  const paths = await converter.convert(ctx.inputPaths.slice(0, 1), { operation: 'resize', width, height, fit: ctx.params.fit ?? 'inside' }, ctx.onProgress);
  return { paths, names: [swapExt(ctx.inputNames[0], path.extname(ctx.inputNames[0]) || '.jpg', paths[0])] };
};

export const jpgToPng: Processor = async (ctx) => {
  const paths = await converter.convert(ctx.inputPaths.slice(0, 1), { operation: 'convert', format: 'png' }, ctx.onProgress);
  return { paths, names: [swapExt(ctx.inputNames[0], '.png', paths[0])] };
};

export const pngToJpg: Processor = async (ctx) => {
  const quality = Math.max(1, Math.min(100, Number(ctx.params.quality ?? 90)));
  const paths = await converter.convert(ctx.inputPaths.slice(0, 1), { operation: 'convert', format: 'jpeg', quality }, ctx.onProgress);
  return { paths, names: [swapExt(ctx.inputNames[0], '.jpg', paths[0])] };
};

export const webpToJpg: Processor = async (ctx) => {
  const quality = Math.max(1, Math.min(100, Number(ctx.params.quality ?? 90)));
  const paths = await converter.convert(ctx.inputPaths.slice(0, 1), { operation: 'convert', format: 'jpeg', quality }, ctx.onProgress);
  return { paths, names: [swapExt(ctx.inputNames[0], '.jpg', paths[0])] };
};

export const imageConvert: Processor = async (ctx) => {
  const format = String(ctx.params.format ?? 'png').toLowerCase();
  if (!['jpeg', 'jpg', 'png', 'webp'].includes(format)) {
    throw new Error('format must be jpeg|png|webp');
  }
  const quality = Math.max(1, Math.min(100, Number(ctx.params.quality ?? 90)));
  const target = format === 'jpg' ? 'jpeg' : format;
  const paths = await converter.convert(ctx.inputPaths.slice(0, 1), { operation: 'convert', format: target as any, quality }, ctx.onProgress);
  const ext = target === 'jpeg' ? '.jpg' : `.${target}`;
  const mime = target === 'jpeg' ? 'image/jpeg' : target === 'png' ? 'image/png' : 'image/webp';
  return { paths, names: [swapExt(ctx.inputNames[0], ext, paths[0])], mimeTypes: [mime] };
};

export const imageEffects: Processor = async (ctx) => {
  const sharp = (await import('sharp')).default;
  const mode = String(ctx.params.mode ?? 'grayscale').toLowerCase();
  if (!['grayscale', 'blur', 'sharpen', 'negate', 'normalize'].includes(mode)) {
    throw new Error('mode must be grayscale|blur|sharpen|negate|normalize');
  }
  const src = ctx.inputPaths[0];
  ctx.onProgress(20);
  let pipe = sharp(src, { failOnError: false }).rotate();
  if (mode === 'grayscale') pipe = pipe.grayscale();
  else if (mode === 'blur') pipe = pipe.blur(Math.max(1, Math.min(20, Number(ctx.params.amount ?? 5))));
  else if (mode === 'sharpen') pipe = pipe.sharpen();
  else if (mode === 'negate') pipe = pipe.negate({ alpha: false });
  else pipe = pipe.normalize();
  const ext = path.extname(ctx.inputNames[0]).toLowerCase() || '.png';
  const out = await tmpOut(ext);
  ctx.onProgress(60);
  await pipe.toFile(out);
  ctx.onProgress(100);
  return { paths: [out], names: [swapExt(ctx.inputNames[0], ext, out, `-${mode}`)] };
};

export const pngToIco: Processor = async (ctx) => {
  // Real multi-size ICO favicon via png-to-ico (pure JS, no shell).
  const pngToIco = (await import('png-to-ico')).default as any;
  const src = ctx.inputPaths[0];
  ctx.onProgress(20);
  const sizes = [16, 32, 48];
  const sharp = (await import('sharp')).default;
  const pngs: Buffer[] = [];
  for (const s of sizes) {
    pngs.push(await sharp(src, { failOnError: false }).resize(s, s, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer());
    ctx.onProgress(20 + Math.round((sizes.indexOf(s) + 1) * 60 / sizes.length));
  }
  const ico: Buffer = await pngToIco(pngs);
  const out = await tmpOut('.ico');
  await fs.writeFile(out, ico);
  ctx.onProgress(100);
  return { paths: [out], names: [swapExt(ctx.inputNames[0], '.ico', out, '-favicon')], mimeTypes: ['image/x-icon'] };
};

export const backgroundRemove: Processor = async (ctx) => {
  // Real integration via @imgly/background-removal-node (ONNX, local). Not faked.
  // If the optional dependency/model is unavailable, fail with an actionable error.
  let mod: any;
  try {
    const { dynamicImport } = await import('../../../utils/dynamicImport.js');
    mod = await dynamicImport('@imgly/background-removal-node');
  } catch {
    throw new Error(
      'Background removal requires the optional dependency @imgly/background-removal-node. Install it with: npm i @imgly/background-removal-node (downloads ~40MB ONNX model on first run)'
    );
  }
  ctx.onProgress(10);
  const src = ctx.inputPaths[0];
  const buf = await fs.readFile(src);
  // NOTE: @imgly decodes via Blob.type — an untyped Blob throws "Unsupported format: ".
  // Derive the MIME from the validated original filename (validation already ran).
  const ext = path.extname(ctx.inputNames[0] || '').toLowerCase();
  const mimeType =
    ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'image/png';
  const blob = new Blob([new Uint8Array(buf)], { type: mimeType });
  // BG_MODEL=small uses the ~40MB quantized model (fits 512MB hosts);
  // medium is default quality. Configurable without code changes.
  const model = ['small', 'medium'].includes(String(process.env.BG_MODEL ?? '').toLowerCase())
    ? String(process.env.BG_MODEL).toLowerCase()
    : 'medium';
  const outBlob: Blob = await mod.removeBackground(blob, { model });
  const outBuf = Buffer.from(await outBlob.arrayBuffer());
  ctx.onProgress(90);
  const out = await tmpOut('.png');
  await fs.writeFile(out, outBuf);
  ctx.onProgress(100);
  return { paths: [out], names: [swapExt(ctx.inputNames[0], '.png', out, '-no-bg')] };
};

function swapExt(original: string, newExt: string, _actual: string, suffix = ''): string {
  const base = path.basename(original, path.extname(original)).slice(0, 100) || 'output';
  return `${base}${suffix}${newExt}`;
}
