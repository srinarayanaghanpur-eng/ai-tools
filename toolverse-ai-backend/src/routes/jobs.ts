import { Router } from 'express';
import { Jobs, Files } from '../db/repositories.js';
import { Errors } from '../errors.js';
import { ok } from '../utils/responses.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { downloadLimiter } from '../middleware/rateLimit.js';
import { cancelJob, streamCheck } from '../jobs/pipeline.js';
import { getStorage } from '../services/storage/index.js';
import { verifyDownloadToken } from '../utils/crypto.js';
import contentDisposition from '../utils/contentDisposition.js';

const router = Router();
router.use(optionalAuth);

function sanitizeJob(j: any, includeOutputs = true) {
  if (!j) return j;
  // output_files already safe (no internal paths) — built by pipeline
  if (!includeOutputs) {
    const { output_files, ...rest } = j;
    void output_files;
    return rest;
  }
  return j;
}

router.get('/:jobId', async (req, res, next) => {
  try {
    const job = Jobs.getById(req.params.jobId) as any;
    if (!job) throw Errors.jobNotFound();
    // Privacy: anonymous jobs visible only with... allow if requester owns or job is anonymous?
    // For simplicity: owner, admin, or anyone with jobId (unlisted URL). Anonymous jobs are unlisted-capable.
    // Authenticated users can only see own jobs + anonymous? Enforce: if job has user and requester differs and not admin → 404.
    const me = (req as any).user;
    if (job.user_id && (!me?.id || (me.id !== job.user_id && me.role !== 'admin'))) {
      throw Errors.jobNotFound();
    }
    return ok(res, { job: sanitizeJob(job) });
  } catch (e) {
    return next(e);
  }
});

router.post('/:jobId/cancel', requireAuth, async (req, res, next) => {
  try {
    const job = Jobs.getById(req.params.jobId) as any;
    if (!job) throw Errors.jobNotFound();
    const me = (req as any).user;
    if (job.user_id !== me.id && me.role !== 'admin') throw Errors.forbidden('Not your job');
    if (!['QUEUED', 'PROCESSING'].includes(job.status)) {
      return ok(res, { job: Jobs.getById(job.id), cancelled: false, message: 'Job already finished' });
    }
    cancelJob(job.id);
    Jobs.setCancelled(job.id);
    return ok(res, { job: Jobs.getById(job.id), cancelled: true });
  } catch (e) {
    return next(e);
  }
});

/**
 * GET /api/jobs/:jobId/download?fileId=xxx[&token=...]
 * - Owner/admin with JWT can download directly.
 * - Anonymous holders of a signed token (downloadToken from job output) can download.
 */
router.get('/:jobId/download', downloadLimiter, async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const fileId = String(req.query.fileId ?? '');
    if (!fileId) throw Errors.validation('fileId query required');
    const job = Jobs.getById(jobId) as any;
    if (!job) throw Errors.jobNotFound();
    if (job.status !== 'COMPLETED') throw Errors.validation(`Job not completed (status=${job.status})`);

    const me = (req as any).user;
    const isOwner = me?.id && (job.user_id === me.id || me.role === 'admin');
    const isAnonymousJob = !job.user_id;

    if (!isOwner && !isAnonymousJob) {
      // Try signed token
      const token = String(req.query.token ?? '');
      if (!token) throw Errors.forbidden('Download requires ownership or signed token');
      const v = verifyDownloadToken(token);
      if (!v || v.jobId !== jobId || v.fileId !== fileId) {
        throw Errors.forbidden('Invalid or expired download token');
      }
    }
    if (isAnonymousJob && !isOwner) {
      // Anonymous job: still require token if provided? Allow unlisted jobId+fileId for UX,
      // but if job has outputs with tokens, accept either. Keep open for MVP (unlisted URL).
    }

    const file = streamCheck(jobId, fileId) as any;
    const storage = getStorage();

    res.setHeader('Content-Type', file.mime ?? 'application/octet-stream');
    res.setHeader('Content-Disposition', contentDisposition(file.original_name));
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Stream without exposing internal paths
    try {
      const stream = await storage.stream(file.stored_key);
      (stream as any).on('error', (err: any) => next(err));
      (stream as any).pipe(res);
    } catch {
      // Fallback to buffer (e.g., S3 mock)
      const buf = await storage.read(file.stored_key);
      res.setHeader('Content-Length', buf.length);
      res.send(buf);
    }
  } catch (e) {
    return next(e);
  }
});

// Debug helper (dev): list files in job — owner only
router.get('/:jobId/files', async (req, res, next) => {
  try {
    const job = Jobs.getById(req.params.jobId) as any;
    if (!job) throw Errors.jobNotFound();
    const me = (req as any).user;
    if (job.user_id && (!me?.id || (me.id !== job.user_id && me.role !== 'admin'))) {
      throw Errors.jobNotFound();
    }
    const { getDb } = await import('../db/connection.js');
    const rows = getDb().prepare('SELECT id, kind, original_name, mime, size_bytes, created_at, expires_at FROM files WHERE job_id=?').all(job.id);
    void Files;
    return ok(res, { files: rows });
  } catch (e) {
    return next(e);
  }
});

export default router;
