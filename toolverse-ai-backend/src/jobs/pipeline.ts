import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import mime from 'mime-types';
import { getToolById } from '../tools/registry.js';
import { validateInputFiles } from '../utils/fileValidation.js';
import { getStorage } from '../services/storage/index.js';
import { Jobs, Files, Usage, ToolsRepo } from '../db/repositories.js';
import { Errors, AppError } from '../errors.js';
import { logger } from '../utils/logger.js';
import { randomFilename, sanitizeBasename, signDownload } from '../utils/crypto.js';
import { env } from '../config/env.js';
import { jobQueue } from './queue.js';

export interface UploadedFile {
  path: string; // multer tmp path
  originalname: string;
  size: number;
  mimetype?: string;
}

const abortControllers = new Map<string, AbortController>();

export function cancelJob(jobId: string): boolean {
  const c = abortControllers.get(jobId);
  if (c) {
    try {
      c.abort();
    } catch { /* ignore */ }
  }
  return true;
}

function errorCodeFor(e: any): string {
  if (e instanceof AppError) return e.code;
  const msg = String(e?.message ?? '');
  if (/unsupported|not allowed/i.test(msg)) return 'UNSUPPORTED_FORMAT';
  if (/too large|exceed/i.test(msg)) return 'FILE_TOO_LARGE';
  if (/AI_|OPENAI|ANTHROPIC|GOOGLE|provider|API key/i.test(msg)) return 'AI_PROVIDER_ERROR';
  if (/storage|S3/i.test(msg)) return 'STORAGE_ERROR';
  if (/poppler|pdftoppm|libreoffice|ffmpeg|model/i.test(msg)) return 'PROCESSING_FAILED';
  return 'PROCESSING_FAILED';
}

function safeUserMessage(e: any): string {
  if (e instanceof AppError) return e.message;
  const msg = String(e?.message ?? 'Processing failed');
  // Pass through actionable config errors (no secrets), cap length
  return msg.slice(0, 500);
}

/**
 * Upload → Validation → Create Job → Queue
 * Returns job immediately; heavy work happens in worker.
 */
export async function createJob(opts: {
  toolIdOrSlug: string;
  userId: string | null;
  files: UploadedFile[];
  params?: Record<string, any>;
  text?: string;
}): Promise<any> {
  const tool = getToolById(opts.toolIdOrSlug);
  if (!tool) throw Errors.toolNotFound();
  // Check DB status override (admin can disable)
  const dbTool = ToolsRepo.getById(tool.id) ?? ToolsRepo.getBySlug(tool.slug);
  const status = dbTool?.status ?? tool.status;
  if (status === 'disabled') throw Errors.toolDisabled();

  const params = { ...(opts.params ?? {}) };
  const text = opts.text ?? (typeof params.text === 'string' ? params.text : undefined);

  // Text/json tools: text required (except uuid which needs none)
  if (tool.inputType === 'text' || tool.inputType === 'json') {
    if (tool.slug !== 'uuid-generator' && (!text || !String(text).trim())) {
      throw Errors.validation('Missing text input (field "text" required)');
    }
    if (text && text.length > 500_000) throw Errors.validation('Text too long');
  }

  // File validation (server-side MIME + ext + size)
  const multerFiles = (opts.files ?? []).map((f) => ({
    path: f.path,
    originalname: f.originalname,
    size: f.size,
  }));
  if (tool.inputType === 'file' || tool.inputType === 'files' || tool.inputType === 'file+text') {
    await validateInputFiles(tool, multerFiles);
  }

  const storage = getStorage();
  const expiresAt = new Date(Date.now() + env.FILE_TTL_HOURS * 3600 * 1000).toISOString();
  const storedInputs: any[] = [];

  // Store inputs in isolated storage with random names (never original paths)
  for (const f of multerFiles) {
    const safeOriginal = sanitizeBasename(f.originalname);
    const key = `uploads/${randomFilename(safeOriginal)}`;
    const data = await fs.readFile(f.path);
    const detectedMime = (mime.lookup(safeOriginal) as string) || 'application/octet-stream';
    await storage.save(key, data, detectedMime);
    storedInputs.push({
      originalName: safeOriginal,
      storedKey: key,
      mime: detectedMime,
      size: data.length,
    });
    // Remove multer tmp immediately after persisting
    await fs.unlink(f.path).catch(() => undefined);
  }

  // AI tools also accept an optional file (pdf-summarizer) plus text; already handled.

  const jobRow = Jobs.create({
    user_id: opts.userId,
    tool_id: tool.id,
    input_files: storedInputs,
    params: { ...params, ...(text ? { _textLength: String(text).length } : {}) },
    expires_at: expiresAt,
  });

  // Persist file rows
  for (const inp of storedInputs) {
    Files.create({
      job_id: jobRow.id,
      owner_user_id: opts.userId,
      kind: 'input',
      original_name: inp.originalName,
      stored_key: inp.storedKey,
      mime: inp.mime,
      size_bytes: inp.size,
      expires_at: expiresAt,
    });
  }

  // Store text payload alongside job params for worker (not in files table)
  // To avoid bloating the jobs table for huge texts, cap: text tools already capped at 500k.
  if (text) {
    const { getDb } = await import('../db/connection.js');
    getDb().prepare('UPDATE jobs SET params=? WHERE id=?').run(
      JSON.stringify({ ...(params ?? {}), __text: text }),
      jobRow.id
    );
  }

  logger.info({ jobId: jobRow.id, tool: tool.slug, user: opts.userId }, 'job queued');
  jobQueue.notify(jobRow.id);
  return Jobs.getById(jobRow.id);
}

/**
 * Worker execution: Processing → Store Result → Usage → Cleanup tmps
 * Called with an already-claimed (PROCESSING) job.
 */
export async function executeJob(job: any): Promise<void> {
  const controller = new AbortController();
  abortControllers.set(job.id, controller);
  const tmpDirs: string[] = [];
  const tmpInputs: string[] = [];

  const onProgress = (pct: number) => {
    try {
      // Don't clobber terminal states
      const cur = Jobs.getById(job.id) as any;
      if (cur && (cur.status === 'PROCESSING' || cur.status === 'QUEUED')) {
        Jobs.setProgress(job.id, pct);
      }
    } catch { /* ignore */ }
  };

  try {
    // Check cancelled before starting
    const fresh = Jobs.getById(job.id) as any;
    if (!fresh || fresh.status === 'CANCELLED') return;

    const tool = getToolById(fresh.tool_id);
    if (!tool) throw Errors.toolNotFound();

    const storage = getStorage();
    const inputFiles: any[] = fresh.input_files ?? [];

    // Materialize inputs to isolated tmp dir for processing (storage-agnostic)
    const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tv-work-'));
    tmpDirs.push(workDir);
    const inputPaths: string[] = [];
    const inputNames: string[] = [];
    for (const inp of inputFiles) {
      if (controller.signal.aborted) throw Object.assign(new Error('Job cancelled'), { cancelled: true });
      const buf = await storage.read(inp.storedKey);
      const tmpPath = path.join(workDir, `${crypto.randomUUID()}-${sanitizeBasename(inp.originalName)}`);
      await fs.writeFile(tmpPath, buf, { mode: 0o600 });
      inputPaths.push(tmpPath);
      tmpInputs.push(tmpPath);
      inputNames.push(inp.originalName);
    }

    const params = { ...(fresh.params ?? {}) };
    const text = typeof params.__text === 'string' ? params.__text : undefined;
    delete params.__text;
    delete params._textLength;

    onProgress(10);
    const result = await tool.processor({
      jobId: job.id,
      userId: fresh.user_id,
      toolId: tool.id,
      inputPaths,
      inputNames,
      params,
      text,
      onProgress,
      signal: controller.signal,
    });

    if (controller.signal.aborted) throw Object.assign(new Error('Job cancelled'), { cancelled: true });

    // Store outputs (never expose internal paths)
    const expiresAt = new Date(Date.now() + env.FILE_TTL_HOURS * 3600 * 1000).toISOString();
    const outputMeta: any[] = [];
    for (let i = 0; i < result.paths.length; i++) {
      const p = result.paths[i];
      const suggested = sanitizeBasename(result.names[i] ?? `output-${i}`);
      const data = await fs.readFile(p);
      if (!data.length) throw new Error('Processor produced empty output');
      const key = `outputs/${randomFilename(suggested)}`;
      const mt = result.mimeTypes?.[i] ?? ((mime.lookup(suggested) as string) || 'application/octet-stream');
      await storage.save(key, data, mt);
      const fileRow = Files.create({
        job_id: job.id,
        owner_user_id: fresh.user_id,
        kind: 'output',
        original_name: suggested,
        stored_key: key,
        mime: mt,
        size_bytes: data.length,
        expires_at: expiresAt,
      }) as any;
      const exp = Date.now() + env.SIGNED_URL_TTL * 1000;
      outputMeta.push({
        fileId: fileRow.id,
        filename: suggested,
        mime: mt,
        size: data.length,
        downloadUrl: `/api/jobs/${job.id}/download?fileId=${fileRow.id}`,
        signedUrl: `/api/jobs/${job.id}/download?fileId=${fileRow.id}&expires=${exp}&sig=${signDownload(job.id, fileRow.id, exp).split('.').slice(3).join('.')}&exp=${exp}`,
        // canonical signed token form:
        downloadToken: signDownload(job.id, fileRow.id, exp),
      });
      // Remove processor tmp output after persisting
      await fs.unlink(p).catch(() => undefined);
    }

    // Copy ai tokens/meta if provided
    Jobs.setCompleted(job.id, outputMeta);
    // Record usage (bytes in+out, ai tokens)
    const bytesIn = inputFiles.reduce((s: number, f: any) => s + (f.size ?? 0), 0);
    const bytesOut = outputMeta.reduce((s: number, f: any) => s + (f.size ?? 0), 0);
    Usage.record({
      user_id: fresh.user_id,
      tool_id: tool.id,
      job_id: job.id,
      bytes_processed: bytesIn + bytesOut,
      ai_tokens: (result as any).aiTokensUsed ?? 0,
    });

    // Update job expiry
    const { getDb } = await import('../db/connection.js');
    getDb().prepare('UPDATE jobs SET expires_at=? WHERE id=?').run(expiresAt, job.id);

    logger.info({ jobId: job.id, outputs: outputMeta.length }, 'job completed');
  } catch (e: any) {
    if (e?.cancelled || controller.signal.aborted) {
      const cur = Jobs.getById(job.id) as any;
      if (cur && cur.status !== 'COMPLETED') {
        Jobs.setCancelled(job.id);
      }
      logger.info({ jobId: job.id }, 'job cancelled');
      return;
    }
    const code = errorCodeFor(e);
    const msg = safeUserMessage(e);
    logger.error({ err: e, jobId: job.id, code }, 'job failed');
    try {
      Jobs.setFailed(job.id, code, msg);
    } catch (le) {
      logger.error({ err: le }, 'failed to mark job failed');
    }
  } finally {
    abortControllers.delete(job.id);
    // Cleanup all tmp inputs + work dirs
    for (const p of tmpInputs) {
      await fs.unlink(p).catch(() => undefined);
    }
    for (const d of tmpDirs) {
      await fs.rm(d, { recursive: true, force: true }).catch(() => undefined);
    }
    // Best-effort: remove stray multer leftovers is handled by cleanup cron
  }
}

/** Ensure local download streaming without leaking internal paths. */
export async function getOutputFile(jobId: string, fileId: string): Promise<{ buffer: Buffer; filename: string; mime: string }> {
  const file = Files.getById(fileId) as any;
  if (!file || file.job_id !== jobId || file.kind !== 'output') {
    throw Errors.notFound('Output file not found');
  }
  const storage = getStorage();
  const buffer = await storage.read(file.stored_key);
  return { buffer, filename: file.original_name, mime: file.mime ?? 'application/octet-stream' };
}

export function streamCheck(jobId: string, fileId: string) {
  const file = Files.getById(fileId) as any;
  if (!file || file.job_id !== jobId || file.kind !== 'output') {
    throw Errors.notFound('Output file not found');
  }
  return file;
}

// Keep TS happy about unused import in some configs
void fssync;
