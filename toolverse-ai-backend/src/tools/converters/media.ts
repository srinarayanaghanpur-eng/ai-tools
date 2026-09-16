import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import { env } from '../../config/env.js';
import { BaseConverter } from './base.js';

export type MediaOperation = 'mp4-to-mp3' | 'video-compress' | 'audio-convert' | 'video-convert';

export interface MediaOptions {
  operation: MediaOperation;
  /** e.g. 'mp3' | 'wav' | 'ogg' | 'm4a' for audio-convert; 'mp4'|'webm' for video-convert */
  format?: string;
  bitrate?: string;
  crf?: number;
}

function setupBinaries() {
  const ff = env.FFMPEG_PATH || (ffmpegStatic as unknown as string);
  const fp = env.FFPROBE_PATH || (ffprobeStatic as any)?.path;
  if (ff) {
    try {
      ffmpeg.setFfmpegPath(ff);
    } catch { /* ignore */ }
  }
  if (fp) {
    try {
      ffmpeg.setFfprobePath(fp);
    } catch { /* ignore */ }
  }
}
setupBinaries();

export class MediaConverter extends BaseConverter<MediaOptions> {
  name = 'media';

  async convert(input: string[], options: MediaOptions, onProgress?: (p: number) => void): Promise<string[]> {
    const src = input[0];
    await this.assertExists(src);
    const op = options.operation;

    const run = (build: (cmd: ffmpeg.FfmpegCommand) => ffmpeg.FfmpegCommand, ext: string) =>
      new Promise<string[]>((resolve, reject) => {
        this.tmpOutput(ext)
          .then((out) => {
            let cmd = ffmpeg(src);
            cmd = build(cmd);
            cmd
              .on('progress', (p: any) => {
                if (typeof p?.percent === 'number') onProgress?.(Math.min(95, Math.round(p.percent)));
              })
              .on('end', () => {
                onProgress?.(100);
                resolve([out]);
              })
              .on('error', (e) => reject(new Error(`ffmpeg failed: ${e.message}`)))
              .save(out);
          })
          .catch(reject);
      });

    onProgress?.(5);

    if (op === 'mp4-to-mp3') {
      return run((c) => c.noVideo().audioCodec('libmp3lame').audioBitrate(options.bitrate ?? '192k').format('mp3'), '.mp3');
    }
    if (op === 'video-compress') {
      const crf = Math.max(18, Math.min(35, options.crf ?? 26));
      return run(
        (c) => c.videoCodec('libx264').audioCodec('aac').outputOptions([`-crf ${crf}`, '-preset veryfast', '-movflags +faststart']),
        '.mp4'
      );
    }
    if (op === 'audio-convert') {
      const fmt = (options.format ?? 'mp3').toLowerCase();
      const allowed = ['mp3', 'wav', 'ogg', 'm4a', 'flac'];
      if (!allowed.includes(fmt)) throw new Error(`Unsupported audio format: ${fmt}`);
      const codec: Record<string, string> = { mp3: 'libmp3lame', wav: 'pcm_s16le', ogg: 'libvorbis', m4a: 'aac', flac: 'flac' };
      return run((c) => c.noVideo().audioCodec(codec[fmt]).format(fmt), `.${fmt}`);
    }
    if (op === 'video-convert') {
      const fmt = (options.format ?? 'mp4').toLowerCase();
      if (!['mp4', 'webm', 'mov'].includes(fmt)) throw new Error(`Unsupported video format: ${fmt}`);
      if (fmt === 'webm') return run((c) => c.videoCodec('libvpx-vp9').audioCodec('libopus').format('webm'), '.webm');
      return run((c) => c.videoCodec('libx264').audioCodec('aac').outputOptions(['-movflags +faststart']).format(fmt), `.${fmt}`);
    }
    throw new Error(`Unsupported media operation: ${op}`);
  }
}
