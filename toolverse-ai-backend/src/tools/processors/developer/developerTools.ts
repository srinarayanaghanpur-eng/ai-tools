import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import type { Processor } from '../../types.js';

async function writeText(name: string, content: string): Promise<string> {
  const dir = path.join(os.tmpdir(), 'toolverse-outputs');
  await fs.mkdir(dir, { recursive: true });
  const out = path.join(dir, `${crypto.randomUUID()}-${name}`);
  await fs.writeFile(out, content, 'utf8');
  return out;
}

function getText(ctx: any): string {
  if (typeof ctx.text === 'string' && ctx.text.length) return ctx.text;
  if (typeof ctx.params?.text === 'string') return ctx.params.text;
  if (typeof ctx.params?.input === 'string') return ctx.params.input;
  throw new Error('Missing text input (provide "text" field)');
}

export const jsonFormat: Processor = async (ctx) => {
  const raw = getText(ctx);
  if (raw.length > 2_000_000) throw new Error('JSON too large (max ~2MB for formatter)');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e: any) {
    throw new Error(`Invalid JSON: ${e.message}`);
  }
  const indent = Math.max(0, Math.min(8, Number(ctx.params.indent ?? 2)));
  const out = await writeText('formatted.json', JSON.stringify(parsed, null, indent));
  ctx.onProgress(100);
  return { paths: [out], names: ['formatted.json'], mimeTypes: ['application/json'] };
};

export const jsonValidate: Processor = async (ctx) => {
  const raw = getText(ctx);
  let valid = true;
  let error: string | null = null;
  try {
    JSON.parse(raw);
  } catch (e: any) {
    valid = false;
    error = e.message;
  }
  const out = await writeText('validation.json', JSON.stringify({ valid, error }, null, 2));
  ctx.onProgress(100);
  return { paths: [out], names: ['validation.json'], mimeTypes: ['application/json'], meta: { valid } };
};

export const base64Codec: Processor = async (ctx) => {
  const mode = String(ctx.params.mode ?? 'encode').toLowerCase();
  const raw = getText(ctx);
  let result: string;
  if (mode === 'encode') {
    result = Buffer.from(raw, 'utf8').toString('base64');
  } else if (mode === 'decode') {
    if (!/^[A-Za-z0-9+/=\s]+$/.test(raw.trim())) throw new Error('Invalid base64 input');
    try {
      result = Buffer.from(raw.replace(/\s+/g, ''), 'base64').toString('utf8');
    } catch {
      throw new Error('Invalid base64 input');
    }
  } else {
    throw new Error('mode must be encode|decode');
  }
  const out = await writeText(mode === 'encode' ? 'encoded.txt' : 'decoded.txt', result);
  ctx.onProgress(100);
  return { paths: [out], names: [mode === 'encode' ? 'encoded.txt' : 'decoded.txt'], mimeTypes: ['text/plain'] };
};

export const urlCodec: Processor = async (ctx) => {
  const mode = String(ctx.params.mode ?? 'encode').toLowerCase();
  const raw = getText(ctx);
  let result: string;
  if (mode === 'encode') result = encodeURIComponent(raw);
  else if (mode === 'decode') {
    try {
      result = decodeURIComponent(raw);
    } catch {
      throw new Error('Invalid URL-encoded input');
    }
  } else throw new Error('mode must be encode|decode');
  const out = await writeText('url.txt', result);
  ctx.onProgress(100);
  return { paths: [out], names: ['url.txt'], mimeTypes: ['text/plain'] };
};

export const uuidGenerate: Processor = async (ctx) => {
  const count = Math.max(1, Math.min(100, Number(ctx.params.count ?? 1)));
  const list = Array.from({ length: count }, () => crypto.randomUUID());
  const out = await writeText('uuids.txt', list.join('\n'));
  ctx.onProgress(100);
  return { paths: [out], names: ['uuids.txt'], mimeTypes: ['text/plain'], meta: { count, uuids: count <= 10 ? list : undefined } };
};

export const hashGenerate: Processor = async (ctx) => {
  const raw = getText(ctx);
  const algo = String(ctx.params.algorithm ?? 'sha256').toLowerCase();
  if (!['md5', 'sha1', 'sha256', 'sha512'].includes(algo)) throw new Error('algorithm must be md5|sha1|sha256|sha512');
  const digest = crypto.createHash(algo).update(raw, 'utf8').digest('hex');
  const out = await writeText('hash.txt', JSON.stringify({ algorithm: algo, hash: digest }, null, 2));
  ctx.onProgress(100);
  return { paths: [out], names: ['hash.txt'], mimeTypes: ['application/json'], meta: { algorithm: algo, hash: digest } };
};

export const yamlConvert: Processor = async (ctx) => {
  // Real YAML<->JSON conversion via js-yaml (no shell, pure JS).
  const yaml = (await import('js-yaml')).default;
  const raw = getText(ctx);
  if (raw.length > 2_000_000) throw new Error('Input too large (max ~2MB)');
  const mode = String(ctx.params.mode ?? 'auto').toLowerCase();
  const looksJson = raw.trimStart().startsWith('{') || raw.trimStart().startsWith('[');
  const toJson = mode === 'yaml-to-json' || (mode === 'auto' && !looksJson);
  let out: string;
  let outName: string;
  let mime: string;
  if (toJson) {
    let doc: unknown;
    try {
      doc = yaml.load(raw);
    } catch (e: any) {
      throw new Error(`Invalid YAML: ${e.message}`);
    }
    if (doc === undefined) throw new Error('Empty YAML document');
    out = JSON.stringify(doc, null, 2);
    outName = 'converted.json';
    mime = 'application/json';
  } else {
    let doc: unknown;
    try {
      doc = JSON.parse(raw);
    } catch (e: any) {
      throw new Error(`Invalid JSON: ${e.message}`);
    }
    out = yaml.dump(doc, { noRefs: true });
    outName = 'converted.yaml';
    mime = 'text/yaml';
  }
  const outPath = await writeText(outName, out);
  ctx.onProgress(100);
  return { paths: [outPath], names: [outName], mimeTypes: [mime] };
};

export const jwtDecode: Processor = async (ctx) => {
  // Real JWT structure decoding (header + payload). Never verifies signatures
  // server-side as a trust decision — output is clearly labeled "unverified".
  const raw = getText(ctx).trim().split(/\s+/).pop()!;
  const parts = raw.split('.');
  if (parts.length !== 3) throw new Error('Not a JWT (expected header.payload.signature)');
  const b64url = (s: string) => {
    if (!/^[A-Za-z0-9_-]*$/.test(s)) throw new Error('Invalid base64url segment');
    return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  };
  let header: unknown;
  let payload: unknown;
  try {
    header = JSON.parse(b64url(parts[0]));
    payload = JSON.parse(b64url(parts[1]));
  } catch {
    throw new Error('JWT segments are not valid JSON');
  }
  const exp = (payload as any)?.exp;
  const expired = typeof exp === 'number' ? Date.now() / 1000 > exp : null;
  const report = {
    warning: 'UNVERIFIED — signature was NOT checked. Do not trust this token based on this output.',
    header,
    payload,
    signature_present: parts[2].length > 0,
    expires_at: typeof exp === 'number' ? new Date(exp * 1000).toISOString() : null,
    expired,
  };
  const out = await writeText('jwt.json', JSON.stringify(report, null, 2));
  ctx.onProgress(100);
  return { paths: [out], names: ['jwt.json'], mimeTypes: ['application/json'], meta: { expired } };
};
