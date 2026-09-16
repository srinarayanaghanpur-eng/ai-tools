import ffmpeg from 'fluent-ffmpeg';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { MediaConverter } from '../../converters/media.js';
import type { Processor } from '../../types.js';

const conv = new MediaConverter();

export const mp4ToMp3: Processor = async (ctx) => {
  const bitrate = String(ctx.params.bitrate ?? '192k');
  const paths = await conv.convert(ctx.inputPaths.slice(0, 1), { operation: 'mp4-to-mp3', bitrate }, ctx.onProgress);
  return { paths, names: [swap(ctx.inputNames[0], '.mp3')], mimeTypes: ['audio/mpeg'] };
};

export const videoCompress: Processor = async (ctx) => {
  const crf = Number(ctx.params.crf ?? 26);
  const paths = await conv.convert(ctx.inputPaths.slice(0, 1), { operation: 'video-compress', crf }, ctx.onProgress);
  return { paths, names: [swap(ctx.inputNames[0], '.mp4', '-compressed')], mimeTypes: ['video/mp4'] };
};

export const audioConvert: Processor = async (ctx) => {
  const format = String(ctx.params.format ?? 'mp3').toLowerCase();
  const paths = await conv.convert(ctx.inputPaths.slice(0, 1), { operation: 'audio-convert', format }, ctx.onProgress);
  return { paths, names: [swap(ctx.inputNames[0], `.${format}`)], mimeTypes: [`audio/${format}`] };
};

export const videoToGif: Processor = async (ctx) => {
  // Real high-quality GIF via ffmpeg two-pass palette (palettegen + paletteuse).
  const src = ctx.inputPaths[0];
  const width = Math.max(120, Math.min(480, Number(ctx.params.width ?? 320)));
  const fps = Math.max(5, Math.min(20, Number(ctx.params.fps ?? 12)));
  const seconds = Math.max(1, Math.min(10, Number(ctx.params.seconds ?? 3)));
  const palette = path.join(os.tmpdir(), `tv-pal-${crypto.randomUUID()}.png`);
  const out = path.join(os.tmpdir(), `${crypto.randomUUID()}.gif`);
  const vf = `fps=${fps},scale=${width}:-1:flags=lanczos`;
  await new Promise<void>((resolve, reject) => {
    ffmpeg(src)
      .seekInput(0)
      .duration(seconds)
      .outputOptions(['-vf', `${vf},palettegen`])
      .on('end', () => resolve())
      .on('error', (e) => reject(new Error(`ffmpeg palette failed: ${e.message}`)))
      .save(palette);
  });
  ctx.onProgress(45);
  await new Promise<void>((resolve, reject) => {
    ffmpeg(src)
      .seekInput(0)
      .duration(seconds)
      .input(palette)
      .outputOptions(['-lavfi', `${vf} [x]; [x][1:v] paletteuse`])
      .on('progress', (p: any) => {
        if (typeof p?.percent === 'number') ctx.onProgress(45 + Math.min(50, Math.round(p.percent / 2)));
      })
      .on('end', () => resolve())
      .on('error', (e) => reject(new Error(`ffmpeg gif failed: ${e.message}`)))
      .save(out);
  });
  const { default: fs } = await import('node:fs/promises');
  await fs.unlink(palette).catch(() => undefined);
  ctx.onProgress(100);
  return { paths: [out], names: [swap(ctx.inputNames[0], '.gif')], mimeTypes: ['image/gif'] };
};

export const videoConvert: Processor = async (ctx) => {
  const format = String(ctx.params.format ?? 'mp4').toLowerCase();
  const paths = await conv.convert(ctx.inputPaths.slice(0, 1), { operation: 'video-convert', format }, ctx.onProgress);
  return { paths, names: [swap(ctx.inputNames[0], `.${format}`)], mimeTypes: [`video/${format}`] };
};

function swap(original: string, newExt: string, suffix = ''): string {
  const base = path.basename(original, path.extname(original)).slice(0, 100) || 'output';
  return `${base}${suffix}${newExt}`;
}
