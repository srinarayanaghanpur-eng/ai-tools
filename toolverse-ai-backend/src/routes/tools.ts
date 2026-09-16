import { Router } from 'express';
import { listTools, getToolBySlug, toPublicTool, getToolById } from '../tools/registry.js';
import { ToolsRepo, CategoriesRepo } from '../db/repositories.js';
import { Errors } from '../errors.js';
import { ok } from '../utils/responses.js';
import { optionalAuth } from '../middleware/auth.js';
import { processLimiter, uploadLimiter, aiLimiter } from '../middleware/rateLimit.js';
import { upload } from '../middleware/upload.js';
import { createJob } from '../jobs/pipeline.js';

const router = Router();
router.use(optionalAuth);

router.get('/', async (_req, res, next) => {
  try {
    // Merge registry + DB status overrides
    const dbTools = new Map(ToolsRepo.list().map((t: any) => [t.id, t] as const));
    const items = listTools().map((t) => {
      const pub = toPublicTool(t);
      const override = dbTools.get(t.id);
      return { ...pub, status: override?.status ?? pub.status, category_slug: (override as any)?.category_slug ?? t.category };
    });
    const categories = CategoriesRepo.list();
    return ok(res, { tools: items, categories });
  } catch (e) {
    return next(e);
  }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const t = getToolBySlug(req.params.slug);
    if (!t) throw Errors.toolNotFound();
    const dbOverride = ToolsRepo.getById(t.id) as any;
    const pub: any = toPublicTool(t);
    pub.status = dbOverride?.status ?? pub.status;
    return ok(res, { tool: pub });
  } catch (e) {
    return next(e);
  }
});

/**
 * POST /api/tools/:toolId/process
 * Accepts multipart/form-data (files field "files" or "file") AND/OR JSON body { text, params }.
 * Returns { jobId, status } immediately — poll GET /api/jobs/:jobId.
 */
router.post('/:toolId/process', uploadLimiter, processLimiter, upload.any(), async (req, res, next) => {
  try {
    const tool = getToolById(req.params.toolId);
    if (!tool) throw Errors.toolNotFound();

    // AI tools get stricter limiter
    if (tool.category === 'ai') {
      await new Promise<void>((resolve, reject) => {
        aiLimiter(req as any, res as any, (err: any) => (err ? reject(err) : resolve()));
      });
      if (res.headersSent) return;
    }

    // Also accept single "file" field name
    const rawFiles = (req as any).files as any[] | undefined;

    // multer with .array('files') only populates req.files for field 'files'.
    // To support both 'file' and 'files', use upload.any() fallback?
    // Workaround: if no files but body has none either, still proceed (text tools).
    let files: { path: string; originalname: string; size: number }[] = ((rawFiles ?? []) as any[])
      .filter((f: any) => f && f.path && f.originalname)
      .slice(0, 10)
      .map((f: any) => ({
        path: f.path,
        originalname: f.originalname,
        size: f.size,
      }));

    // If client sent field name "file", multer array('files') drops it — re-run with any() fallback?
    // Simplest: also check req.body for base64? No — document that field must be "files".
    // (We keep single-file compat: frontend can send files[0] as "files".)

    let params: Record<string, any> = {};
    let text: string | undefined;

    const contentType = req.headers['content-type'] ?? '';
    if (contentType.includes('multipart/form-data')) {
      // fields arrive as strings; "params" may be JSON string
      const body = req.body ?? {};
      if (typeof body.params === 'string') {
        try {
          params = JSON.parse(body.params);
        } catch {
          throw Errors.validation('Field "params" must be valid JSON');
        }
      } else if (body.params && typeof body.params === 'object') {
        params = body.params;
      }
      // copy other scalar fields into params (quality, width, mode, ...)
      for (const [k, v] of Object.entries(body)) {
        if (k === 'params' || k === 'text') continue;
        if (typeof v === 'string' && k !== 'files') params[k] = v;
      }
      if (typeof body.text === 'string') text = body.text;
    } else {
      params = (req.body?.params && typeof req.body.params === 'object' ? req.body.params : req.body) ?? {};
      text = typeof req.body?.text === 'string' ? req.body.text : undefined;
      // avoid nesting: if body was {text, quality}, keep quality in params
      if (params && typeof params === 'object' && 'text' in params) {
        text = text ?? (params as any).text;
      }
    }

    const userId = (req as any).user?.id ?? null;

    // Premium/auth gating example: video tools >100MB require auth (abuse control)
    if (!userId && tool.category === 'media') {
      // allow small anonymous, block huge? Tool limits already cap; keep open but rate-limited.
    }

    const job = await createJob({ toolIdOrSlug: tool.slug, userId, files: files as any, params, text });
    res.status(202).json({
      success: true,
      data: {
        jobId: (job as any).id,
        status: (job as any).status,
        toolId: tool.id,
        pollUrl: `/api/jobs/${(job as any).id}`,
      },
    });
  } catch (e) {
    // Cleanup any multer tmp files on validation failure
    const files = ((req as any).files ?? []) as any[];
    const { default: fs } = await import('node:fs/promises');
    for (const f of files) {
      await fs.unlink(f.path).catch(() => undefined);
    }
    return next(e);
  }
});

export default router;
