import { Router } from 'express';
import { z } from 'zod';
import { Users, Jobs, ToolsRepo, Usage, Settings, BlogPosts, BlogCategories, CategoriesRepo } from '../db/repositories.js';
import { requireAdmin, optionalAuth } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { ok, paginated } from '../utils/responses.js';
import { getDb } from '../db/connection.js';
import { listTools } from '../tools/registry.js';
import { runCleanupOnce } from '../jobs/cleanup.js';
import { getStorage } from '../services/storage/index.js';

const router = Router();
router.use(optionalAuth);
router.use(requireAdmin);

router.get('/statistics', async (_req, res, next) => {
  try {
    const db = getDb();
    const users = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c;
    const jobsByStatus = db.prepare("SELECT status, COUNT(*) as n FROM jobs GROUP BY status").all();
    const jobsTotal = (db.prepare('SELECT COUNT(*) as c FROM jobs').get() as any).c;
    const storageBytes = (db.prepare('SELECT COALESCE(SUM(size_bytes),0) as s FROM files').get() as any).s;
    const usage = Usage.globalStats();
    return ok(res, { statistics: { users, jobs: { total: jobsTotal, byStatus: jobsByStatus }, storageBytes, usage } });
  } catch (e) {
    return next(e);
  }
});

router.get('/users', validateQuery(z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20), search: z.string().optional() })), async (req, res, next) => {
  try {
    const q = (req as any).validatedQuery;
    const { items, total } = Users.list(q.page, q.limit, q.search);
    return paginated(res, items, q.page, q.limit, total);
  } catch (e) {
    return next(e);
  }
});

router.patch('/users/:id', validateBody(z.object({ role: z.enum(['free', 'premium', 'admin']), plan: z.string().optional() })), async (req, res, next) => {
  try {
    Users.updateRole(req.params.id, req.body.role, req.body.plan);
    const { getById } = await import('../db/repositories.js').then((m) => m.Users);
    void getById;
    return ok(res, { user: Users.getById(req.params.id) });
  } catch (e) {
    return next(e);
  }
});

router.get('/jobs', validateQuery(z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20), status: z.string().optional(), tool_id: z.string().optional() })), async (req, res, next) => {
  try {
    const q = (req as any).validatedQuery;
    const { items, total } = Jobs.listAll(q.page, q.limit, { status: q.status, tool_id: q.tool_id });
    return paginated(res, items, q.page, q.limit, total);
  } catch (e) {
    return next(e);
  }
});

router.get('/jobs/failed', validateQuery(z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) })), async (req, res, next) => {
  try {
    const q = (req as any).validatedQuery;
    const { items, total } = Jobs.listAll(q.page, q.limit, { status: 'FAILED' });
    return paginated(res, items, q.page, q.limit, total);
  } catch (e) {
    return next(e);
  }
});

router.post('/jobs/:id/retry', async (req, res, next) => {
  try {
    const job = Jobs.getById(req.params.id) as any;
    if (!job) return res.status(404).json({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'Job not found' } });
    const db = getDb();
    db.prepare("UPDATE jobs SET status='QUEUED', error_code=NULL, error_message=NULL, progress=0 WHERE id=?").run(job.id);
    const { jobQueue } = await import('../jobs/queue.js');
    jobQueue.notify(job.id);
    return ok(res, { job: Jobs.getById(job.id), retried: true });
  } catch (e) {
    return next(e);
  }
});

router.get('/tools', async (_req, res, next) => {
  try {
    const tools = ToolsRepo.list();
    const registry = new Set(listTools().map((t) => t.id));
    return ok(res, { tools, registrySize: registry.size, categories: CategoriesRepo.list() });
  } catch (e) {
    return next(e);
  }
});

router.post('/tools', validateBody(z.object({
  id: z.string().min(2).max(80),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  name: z.string().min(2).max(120),
  category: z.string().min(2).max(40),
  description: z.string().max(500).optional().default(''),
  input_type: z.string().default('file'),
  accepted_formats: z.array(z.string()).default([]),
  max_file_mb: z.number().int().min(1).max(2000).default(50),
  max_files: z.number().int().min(0).max(20).default(1),
  output_format: z.string().default('binary'),
  status: z.enum(['active', 'disabled', 'beta']).default('active'),
})), async (req, res, next) => {
  try {
    const b = req.body;
    let cat = CategoriesRepo.getBySlug(b.category) as any;
    if (!cat) {
      const db = getDb();
      const { randomUUID } = await import('node:crypto');
      const id = randomUUID();
      db.prepare('INSERT INTO tool_categories (id, slug, name, description, created_at) VALUES (?, ?, ?, ?, ?)').run(id, b.category, b.category, '', new Date().toISOString());
      cat = { id };
    }
    ToolsRepo.upsert({ ...b, category_id: cat.id, config: {} });
    return ok(res, { tool: ToolsRepo.getById(b.id) });
  } catch (e) {
    return next(e);
  }
});

router.patch('/tools/:id', validateBody(z.object({
  status: z.enum(['active', 'disabled', 'beta']).optional(),
  max_file_mb: z.number().int().min(1).max(2000).optional(),
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(1000).optional(),
}).strict()), async (req, res, next) => {
  try {
    const cur = ToolsRepo.getById(req.params.id) as any;
    if (!cur) return res.status(404).json({ success: false, error: { code: 'TOOL_NOT_FOUND', message: 'Tool not found' } });
    const db = getDb();
    if (req.body.status) db.prepare('UPDATE tools SET status=?, updated_at=? WHERE id=?').run(req.body.status, new Date().toISOString(), cur.id);
    if (req.body.max_file_mb) db.prepare('UPDATE tools SET max_file_mb=?, updated_at=? WHERE id=?').run(req.body.max_file_mb, new Date().toISOString(), cur.id);
    if (req.body.name) db.prepare('UPDATE tools SET name=?, updated_at=? WHERE id=?').run(req.body.name, new Date().toISOString(), cur.id);
    if (req.body.description !== undefined) db.prepare('UPDATE tools SET description=?, updated_at=? WHERE id=?').run(req.body.description, new Date().toISOString(), cur.id);
    return ok(res, { tool: ToolsRepo.getById(cur.id) });
  } catch (e) {
    return next(e);
  }
});

router.get('/usage', async (_req, res, next) => {
  try {
    return ok(res, { usage: Usage.globalStats() });
  } catch (e) {
    return next(e);
  }
});

router.get('/storage', async (_req, res, next) => {
  try {
    const db = getDb();
    const files = (db.prepare('SELECT COUNT(*) as c FROM files').get() as any).c;
    const bytes = (db.prepare('SELECT COALESCE(SUM(size_bytes),0) as s FROM files').get() as any).s;
    const byKind = db.prepare('SELECT kind, COUNT(*) as n, COALESCE(SUM(size_bytes),0) as bytes FROM files GROUP BY kind').all();
    const storage = getStorage();
    return ok(res, { storage: { provider: storage.name, files, bytes, byKind } });
  } catch (e) {
    return next(e);
  }
});

router.get('/settings', async (_req, res, next) => {
  try {
    return ok(res, { settings: Settings.all() });
  } catch (e) {
    return next(e);
  }
});

router.patch('/settings', validateBody(z.record(z.any())), async (req, res, next) => {
  try {
    for (const [k, v] of Object.entries(req.body)) {
      if (!/^[a-z0-9_.-]{1,80}$/i.test(k)) continue;
      Settings.set(k, v);
    }
    return ok(res, { settings: Settings.all() });
  } catch (e) {
    return next(e);
  }
});

router.post('/cleanup', async (_req, res, next) => {
  try {
    const out = await runCleanupOnce();
    return ok(res, { cleanup: out });
  } catch (e) {
    return next(e);
  }
});

// ---- Blog management ----
router.get('/blog', validateQuery(z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) })), async (req, res, next) => {
  try {
    const q = (req as any).validatedQuery;
    const { items, total } = BlogPosts.list(false, q.page, q.limit);
    return paginated(res, items, q.page, q.limit, total);
  } catch (e) {
    return next(e);
  }
});

router.post('/blog', validateBody(z.object({
  slug: z.string().min(2).max(160).regex(/^[a-z0-9-]+$/),
  title: z.string().min(2).max(200),
  content: z.string().min(1),
  excerpt: z.string().max(500).optional(),
  category_id: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  featured_image: z.string().optional(),
  seo_title: z.string().max(200).optional(),
  seo_description: z.string().max(500).optional(),
  status: z.enum(['draft', 'published']).default('draft'),
})), async (req, res, next) => {
  try {
    const post = BlogPosts.create({ ...req.body, author_user_id: (req as any).user.id });
    return ok(res, { post });
  } catch (e: any) {
    if (String(e?.message ?? '').includes('UNIQUE')) {
      return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Slug already exists' } });
    }
    return next(e);
  }
});

router.patch('/blog/:id', validateBody(z.object({
  slug: z.string().min(2).max(160).regex(/^[a-z0-9-]+$/).optional(),
  title: z.string().min(2).max(200).optional(),
  content: z.string().min(1).optional(),
  excerpt: z.string().max(500).optional(),
  category_id: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  featured_image: z.string().nullable().optional(),
  seo_title: z.string().max(200).nullable().optional(),
  seo_description: z.string().max(500).nullable().optional(),
  status: z.enum(['draft', 'published']).optional(),
}).strict()), async (req, res, next) => {
  try {
    const post = BlogPosts.update(req.params.id, req.body);
    if (!post) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Post not found' } });
    return ok(res, { post });
  } catch (e) {
    return next(e);
  }
});

router.delete('/blog/:id', async (req, res, next) => {
  try {
    BlogPosts.remove(req.params.id);
    return ok(res, { deleted: true });
  } catch (e) {
    return next(e);
  }
});

router.post('/blog/categories', validateBody(z.object({ slug: z.string().regex(/^[a-z0-9-]+$/), name: z.string().min(2), description: z.string().optional() })), async (req, res, next) => {
  try {
    const c = BlogCategories.create(req.body.slug, req.body.name, req.body.description);
    return ok(res, { category: c });
  } catch (e) {
    return next(e);
  }
});

export default router;
