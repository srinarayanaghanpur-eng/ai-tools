import crypto from 'node:crypto';
import path from 'node:path';
import { env } from '../config/env.js';

export function randomFilename(originalName: string): string {
  const ext = path.extname(originalName || '').toLowerCase().slice(0, 12);
  const safeExt = /^[a-z0-9.]{0,12}$/.test(ext) ? ext : '';
  return `${crypto.randomUUID()}${safeExt}`;
}

export function safeJoin(root: string, ...parts: string[]): string {
  const resolvedRoot = path.resolve(root);
  const joined = path.resolve(resolvedRoot, ...parts);
  if (joined !== resolvedRoot && !joined.startsWith(resolvedRoot + path.sep)) {
    throw new Error('Path traversal blocked');
  }
  return joined;
}

export function sanitizeBasename(name: string): string {
  return path.basename(name).replace(/[^\w.\-() ]+/g, '_').slice(0, 180) || 'file';
}

export function signDownload(jobId: string, fileId: string, expiresAt: number): string {
  const payload = `${jobId}.${fileId}.${expiresAt}`;
  const sig = crypto.createHmac('sha256', env.SIGNED_URL_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifyDownloadToken(token: string): { jobId: string; fileId: string; expiresAt: number } | null {
  const parts = token.split('.');
  if (parts.length !== 4) return null;
  const [jobId, fileId, expStr, sig] = parts;
  const expiresAt = Number(expStr);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;
  const expected = crypto.createHmac('sha256', env.SIGNED_URL_SECRET).update(`${jobId}.${fileId}.${expiresAt}`).digest('hex');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  return { jobId, fileId, expiresAt };
}

export function sha256Hex(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex');
}
