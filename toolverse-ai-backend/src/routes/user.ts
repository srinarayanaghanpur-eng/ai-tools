import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { Jobs, Files, Usage, ApiKeys } from '../db/repositories.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { ok, paginated, created } from '../utils/responses.js';
import { sha256Hex } from '../utils/crypto.js';
import { Errors } from '../errors.js';

const router = Router();
router.use(optionalAuth);
router.use(requireAuth);

const paging = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
});

router.get('/jobs', validateQuery(paging), async (req, res, next) => {
  try {
    const q = (req as any).validatedQuery;
    const { items, total } = Jobs.listForUser((req as any).user.id, q.page, q.limit, q.status);
    return paginated(res, items, q.page, q.limit, total);
  } catch (e) {
    return next(e);
  }
});

router.get('/files', validateQuery(z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) })), async (req, res, next) => {
  try {
    const q = (req as any).validatedQuery;
    const { items, total } = Files.listForUser((req as any).user.id, q.page, q.limit);
    const safe = (items as any[]).map((f) => ({
      id: f.id,
      jobId: f.job_id,
      kind: f.kind,
      filename: f.original_name,
      mime: f.mime,
      size: f.size_bytes,
      createdAt: f.created_at,
      expiresAt: f.expires_at,
    }));
    return paginated(res, safe, q.page, q.limit, total);
  } catch (e) {
    return next(e);
  }
});

router.get('/usage', async (req, res, next) => {
  try {
    const summary = Usage.summaryForUser((req as any).user.id);
    return ok(res, { usage: summary });
  } catch (e) {
    return next(e);
  }
});

// ---- API keys ----
router.get('/api-keys', async (req, res, next) => {
  try {
    return ok(res, { apiKeys: ApiKeys.listForUser((req as any).user.id) });
  } catch (e) {
    return next(e);
  }
});

router.post('/api-keys', async (req, res, next) => {
  try {
    const name = String(req.body?.name ?? 'default').slice(0, 60);
    const raw = `tv_${crypto.randomBytes(32).toString('hex')}`;
    const rec = ApiKeys.create({
      user_id: (req as any).user.id,
      name,
      key_prefix: raw.slice(0, 8),
      key_hash: sha256Hex(raw),
      scopes: ['tools:run', 'jobs:read'],
    }) as any;
    return created(res, { apiKey: raw, id: rec.id, prefix: rec.key_prefix, note: 'Store this key now — it is never shown again.' });
  } catch (e) {
    return next(e);
  }
});

router.delete('/api-keys/:id', async (req, res, next) => {
  try {
    ApiKeys.revoke(req.params.id, (req as any).user.id);
    return ok(res, { revoked: true });
  } catch (e) {
    return next(e);
  }
});

void Errors;

export default router;
