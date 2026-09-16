import { Router } from 'express';
import { z } from 'zod';
import { BlogPosts, BlogCategories } from '../db/repositories.js';
import { ok, paginated } from '../utils/responses.js';
import { validateQuery } from '../middleware/validate.js';

const router = Router();

router.get('/', validateQuery(z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(12) })), async (req, res, next) => {
  try {
    const q = (req as any).validatedQuery;
    const { items, total } = BlogPosts.list(true, q.page, q.limit);
    return paginated(res, items, q.page, q.limit, total);
  } catch (e) {
    return next(e);
  }
});

router.get('/categories', async (_req, res, next) => {
  try {
    return ok(res, { categories: BlogCategories.list() });
  } catch (e) {
    return next(e);
  }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const post = BlogPosts.getBySlug(req.params.slug, true);
    if (!post) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Post not found' } });
    return ok(res, { post });
  } catch (e) {
    return next(e);
  }
});

export default router;
