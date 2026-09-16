import { randomUUID } from 'node:crypto';
import { getDb } from './connection.js';

const now = () => new Date().toISOString();

function row<T = any>(sql: string, ...params: any[]): T | undefined {
  return getDb().prepare(sql).get(...params) as T | undefined;
}
function all<T = any>(sql: string, ...params: any[]): T[] {
  return getDb().prepare(sql).all(...params) as T[];
}
function run(sql: string, ...params: any[]) {
  return getDb().prepare(sql).run(...params);
}

const parseJson = (v: any, fallback: any) => {
  try {
    return typeof v === 'string' ? JSON.parse(v) : (v ?? fallback);
  } catch {
    return fallback;
  }
};

// ---------- Users ----------
export const Users = {
  create(data: { email: string; password_hash: string; name?: string; role?: string; plan?: string }) {
    const id = randomUUID();
    run(
      'INSERT INTO users (id, email, password_hash, name, role, plan, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      id,
      data.email.toLowerCase(),
      data.password_hash,
      data.name ?? null,
      data.role ?? 'free',
      data.plan ?? 'free',
      now(),
      now()
    );
    return Users.getById(id)!;
  },
  getById(id: string) {
    return row('SELECT * FROM users WHERE id = ?', id);
  },
  getByEmail(email: string) {
    return row('SELECT * FROM users WHERE email = ?', email.toLowerCase());
  },
  list(page: number, limit: number, search?: string) {
    const off = (page - 1) * limit;
    if (search) {
      const like = `%${search}%`;
      return {
        items: all('SELECT id, email, name, role, plan, created_at, updated_at FROM users WHERE email LIKE ? OR name LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?', like, like, limit, off),
        total: (row<{ c: number }>('SELECT COUNT(*) as c FROM users WHERE email LIKE ? OR name LIKE ?', like, like)?.c ?? 0),
      };
    }
    return {
      items: all('SELECT id, email, name, role, plan, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?', limit, off),
      total: (row<{ c: number }>('SELECT COUNT(*) as c FROM users')?.c ?? 0),
    };
  },
  updateRole(id: string, role: string, plan?: string) {
    run('UPDATE users SET role = ?, plan = COALESCE(?, plan), updated_at = ? WHERE id = ?', role, plan ?? null, now(), id);
  },
  setReset(id: string, hash: string | null, expires: string | null) {
    run('UPDATE users SET reset_token_hash = ?, reset_expires_at = ?, updated_at = ? WHERE id = ?', hash, expires, now(), id);
  },
  updatePassword(id: string, hash: string) {
    run('UPDATE users SET password_hash = ?, reset_token_hash = NULL, reset_expires_at = NULL, updated_at = ? WHERE id = ?', hash, now(), id);
  },
  count() {
    return row<{ c: number }>('SELECT COUNT(*) as c FROM users')?.c ?? 0;
  },
};

export function sanitizeUser(u: any) {
  if (!u) return u;
  const { password_hash, reset_token_hash, ...rest } = u;
  return rest;
}

// ---------- Sessions ----------
export const Sessions = {
  create(data: { user_id: string; refresh_token_hash: string; user_agent?: string; ip?: string; expires_at: string }) {
    const id = randomUUID();
    run(
      'INSERT INTO sessions (id, user_id, refresh_token_hash, user_agent, ip, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      id, data.user_id, data.refresh_token_hash, data.user_agent ?? null, data.ip ?? null, data.expires_at, now()
    );
    return id;
  },
  getByHash(hash: string) {
    return row('SELECT * FROM sessions WHERE refresh_token_hash = ? AND revoked_at IS NULL', hash);
  },
  revoke(id: string) {
    run('UPDATE sessions SET revoked_at = ? WHERE id = ?', now(), id);
  },
  revokeAllForUser(userId: string) {
    run('UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL', now(), userId);
  },
};

// ---------- Tools ----------
export const ToolsRepo = {
  upsert(tool: { id: string; slug: string; name: string; category_id: string | null; description?: string; input_type: string; accepted_formats: string[]; max_file_mb: number; max_files: number; output_format: string; status: string; config?: any }) {
    const existing = row('SELECT id FROM tools WHERE id = ? OR slug = ?', tool.id, tool.slug);
    if (existing) {
      run(
        'UPDATE tools SET slug=?, name=?, category_id=?, description=?, input_type=?, accepted_formats=?, max_file_mb=?, max_files=?, output_format=?, status=?, config=?, updated_at=? WHERE id=?',
        tool.slug, tool.name, tool.category_id, tool.description ?? '', tool.input_type,
        JSON.stringify(tool.accepted_formats), tool.max_file_mb, tool.max_files, tool.output_format,
        tool.status, JSON.stringify(tool.config ?? {}), now(), (existing as any).id
      );
    } else {
      run(
        'INSERT INTO tools (id, slug, name, category_id, description, input_type, accepted_formats, max_file_mb, max_files, output_format, status, config, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        tool.id, tool.slug, tool.name, tool.category_id, tool.description ?? '', tool.input_type,
        JSON.stringify(tool.accepted_formats), tool.max_file_mb, tool.max_files, tool.output_format,
        tool.status, JSON.stringify(tool.config ?? {}), now(), now()
      );
    }
  },
  list(status?: string) {
    const rows = status
      ? all('SELECT t.*, c.slug as category_slug, c.name as category_name FROM tools t LEFT JOIN tool_categories c ON c.id = t.category_id WHERE t.status = ? ORDER BY c.slug, t.name', status)
      : all('SELECT t.*, c.slug as category_slug, c.name as category_name FROM tools t LEFT JOIN tool_categories c ON c.id = t.category_id ORDER BY c.slug, t.name');
    return rows.map(mapTool);
  },
  getBySlug(slug: string) {
    const r = row('SELECT t.*, c.slug as category_slug, c.name as category_name FROM tools t LEFT JOIN tool_categories c ON c.id = t.category_id WHERE t.slug = ?', slug);
    return r ? mapTool(r) : undefined;
  },
  getById(id: string) {
    const r = row('SELECT t.*, c.slug as category_slug, c.name as category_name FROM tools t LEFT JOIN tool_categories c ON c.id = t.category_id WHERE t.id = ?', id);
    return r ? mapTool(r) : undefined;
  },
  setStatus(id: string, status: string) {
    run('UPDATE tools SET status = ?, updated_at = ? WHERE id = ?', status, now(), id);
  },
};

function mapTool(r: any) {
  return {
    ...r,
    accepted_formats: parseJson(r.accepted_formats, []),
    config: parseJson(r.config, {}),
  };
}

export const CategoriesRepo = {
  list() {
    return all('SELECT * FROM tool_categories ORDER BY name');
  },
  getBySlug(slug: string) {
    return row('SELECT * FROM tool_categories WHERE slug = ?', slug);
  },
};

// ---------- Jobs ----------
export type JobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export const Jobs = {
  create(data: { id?: string; user_id: string | null; tool_id: string; input_files: any[]; params?: any; expires_at?: string }) {
    const id = data.id ?? randomUUID();
    run(
      'INSERT INTO jobs (id, user_id, tool_id, status, progress, input_files, output_files, params, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      id, data.user_id, data.tool_id, 'QUEUED', 0,
      JSON.stringify(data.input_files ?? []), JSON.stringify([]), JSON.stringify(data.params ?? {}), now(), data.expires_at ?? null
    );
    return Jobs.getById(id)!;
  },
  getById(id: string) {
    const r = row('SELECT j.*, t.slug as tool_slug, t.name as tool_name FROM jobs j LEFT JOIN tools t ON t.id = j.tool_id WHERE j.id = ?', id);
    return r ? mapJob(r) : undefined;
  },
  listForUser(userId: string, page: number, limit: number, status?: string) {
    const off = (page - 1) * limit;
    const base = 'FROM jobs j LEFT JOIN tools t ON t.id = j.tool_id WHERE j.user_id = ?';
    const params: any[] = [userId];
    let where = base;
    if (status) {
      where += ' AND j.status = ?';
      params.push(status);
    }
    const items = all(`SELECT j.*, t.slug as tool_slug, t.name as tool_name ${where} ORDER BY j.created_at DESC LIMIT ? OFFSET ?`, ...params, limit, off).map(mapJob);
    const total = (row<{ c: number }>(`SELECT COUNT(*) as c ${where}`, ...params)?.c ?? 0);
    return { items, total };
  },
  listAll(page: number, limit: number, filters: { status?: string; tool_id?: string } = {}) {
    const off = (page - 1) * limit;
    const conds: string[] = [];
    const params: any[] = [];
    if (filters.status) {
      conds.push('j.status = ?');
      params.push(filters.status);
    }
    if (filters.tool_id) {
      conds.push('j.tool_id = ?');
      params.push(filters.tool_id);
    }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const items = all(`SELECT j.*, t.slug as tool_slug FROM jobs j LEFT JOIN tools t ON t.id=j.tool_id ${where} ORDER BY j.created_at DESC LIMIT ? OFFSET ?`, ...params, limit, off).map(mapJob);
    const total = (row<{ c: number }>(`SELECT COUNT(*) as c FROM jobs j ${where}`, ...params)?.c ?? 0);
    return { items, total };
  },
  setProcessing(id: string) {
    run("UPDATE jobs SET status='PROCESSING', started_at=?, progress=5 WHERE id=?", now(), id);
  },
  setProgress(id: string, progress: number) {
    run('UPDATE jobs SET progress=? WHERE id=?', Math.max(0, Math.min(100, progress)), id);
  },
  setCompleted(id: string, outputFiles: any[]) {
    run("UPDATE jobs SET status='COMPLETED', progress=100, output_files=?, completed_at=? WHERE id=?", JSON.stringify(outputFiles), now(), id);
  },
  setFailed(id: string, code: string, message: string) {
    run("UPDATE jobs SET status='FAILED', error_code=?, error_message=?, completed_at=? WHERE id=?", code, message.slice(0, 2000), now(), id);
  },
  setCancelled(id: string) {
    run("UPDATE jobs SET status='CANCELLED', completed_at=? WHERE id=? AND status IN ('QUEUED','PROCESSING')", now(), id);
  },
  stats() {
    const byStatus = all("SELECT status, COUNT(*) as n FROM jobs GROUP BY status");
    const total = row<{ c: number }>('SELECT COUNT(*) as c FROM jobs')?.c ?? 0;
    return { total, byStatus };
  },
  deleteOlderThan(iso: string, statuses: string[] = ['COMPLETED', 'FAILED', 'CANCELLED']) {
    const placeholders = statuses.map(() => '?').join(',');
    run(`DELETE FROM jobs WHERE created_at < ? AND status IN (${placeholders})`, iso, ...statuses);
  },
};

function mapJob(r: any) {
  return {
    ...r,
    input_files: parseJson(r.input_files, []),
    output_files: parseJson(r.output_files, []),
    params: parseJson(r.params, {}),
  };
}

// ---------- Files ----------
export const Files = {
  create(data: { id?: string; job_id?: string | null; owner_user_id?: string | null; kind: 'input' | 'output'; original_name: string; stored_key: string; mime?: string; size_bytes: number; expires_at?: string }) {
    const id = data.id ?? randomUUID();
    run(
      'INSERT INTO files (id, job_id, owner_user_id, kind, original_name, stored_key, mime, size_bytes, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      id, data.job_id ?? null, data.owner_user_id ?? null, data.kind, data.original_name, data.stored_key,
      data.mime ?? null, data.size_bytes, data.expires_at ?? null, now()
    );
    return Files.getById(id)!;
  },
  getById(id: string) {
    return row('SELECT * FROM files WHERE id = ?', id);
  },
  listForUser(userId: string, page: number, limit: number) {
    const off = (page - 1) * limit;
    const items = all('SELECT * FROM files WHERE owner_user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', userId, limit, off);
    const total = (row<{ c: number }>('SELECT COUNT(*) as c FROM files WHERE owner_user_id = ?', userId)?.c ?? 0);
    return { items, total };
  },
  listExpired(nowIso: string) {
    return all('SELECT * FROM files WHERE expires_at IS NOT NULL AND expires_at < ?', nowIso);
  },
  deleteById(id: string) {
    run('DELETE FROM files WHERE id = ?', id);
  },
};

// ---------- Usage ----------
export const Usage = {
  record(data: { user_id: string | null; tool_id?: string | null; job_id?: string | null; units?: number; bytes_processed?: number; ai_tokens?: number }) {
    if (!data.user_id) return;
    run(
      'INSERT INTO usage (id, user_id, tool_id, job_id, units, bytes_processed, ai_tokens, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      randomUUID(), data.user_id, data.tool_id ?? null, data.job_id ?? null,
      data.units ?? 1, data.bytes_processed ?? 0, data.ai_tokens ?? 0, now()
    );
  },
  summaryForUser(userId: string, sinceIso?: string) {
    const since = sinceIso ?? new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const rows = all(
      `SELECT date(created_at) as day, COUNT(*) as jobs, COALESCE(SUM(bytes_processed),0) as bytes, COALESCE(SUM(ai_tokens),0) as tokens
       FROM usage WHERE user_id = ? AND created_at >= ? GROUP BY date(created_at) ORDER BY day DESC`,
      userId, since
    );
    const totals = row<{ jobs: number; bytes: number; tokens: number }>(
      'SELECT COUNT(*) as jobs, COALESCE(SUM(bytes_processed),0) as bytes, COALESCE(SUM(ai_tokens),0) as tokens FROM usage WHERE user_id = ? AND created_at >= ?',
      userId, since
    );
    return { totals, daily: rows };
  },
  globalStats() {
    return {
      totalRecords: row<{ c: number }>('SELECT COUNT(*) as c FROM usage')?.c ?? 0,
      totalBytes: row<{ s: number }>('SELECT COALESCE(SUM(bytes_processed),0) as s FROM usage')?.s ?? 0,
      totalTokens: row<{ s: number }>('SELECT COALESCE(SUM(ai_tokens),0) as s FROM usage')?.s ?? 0,
    };
  },
};

// ---------- API keys ----------
export const ApiKeys = {
  create(data: { user_id: string; name: string; key_prefix: string; key_hash: string; scopes?: string[]; expires_at?: string | null }) {
    const id = randomUUID();
    run(
      'INSERT INTO api_keys (id, user_id, name, key_prefix, key_hash, scopes, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      id, data.user_id, data.name, data.key_prefix, data.key_hash, JSON.stringify(data.scopes ?? []), data.expires_at ?? null, now()
    );
    return row('SELECT * FROM api_keys WHERE id = ?', id);
  },
  getByHash(hash: string) {
    return row("SELECT * FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL", hash);
  },
  listForUser(userId: string) {
    return all('SELECT id, user_id, name, key_prefix, scopes, last_used_at, expires_at, revoked_at, created_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC', userId);
  },
  touch(id: string) {
    run('UPDATE api_keys SET last_used_at = ? WHERE id = ?', now(), id);
  },
  revoke(id: string, userId: string) {
    run('UPDATE api_keys SET revoked_at = ? WHERE id = ? AND user_id = ?', now(), id, userId);
  },
};

// ---------- Blog ----------
export const BlogCategories = {
  list() {
    return all('SELECT * FROM blog_categories ORDER BY name');
  },
  create(slug: string, name: string, description?: string) {
    const id = randomUUID();
    run('INSERT INTO blog_categories (id, slug, name, description) VALUES (?, ?, ?, ?)', id, slug, name, description ?? null);
    return row('SELECT * FROM blog_categories WHERE id = ?', id);
  },
};

export const BlogPosts = {
  list(publishedOnly: boolean, page: number, limit: number) {
    const off = (page - 1) * limit;
    const where = publishedOnly ? "WHERE p.status='published'" : '';
    const items = all(
      `SELECT p.*, c.slug as category_slug, c.name as category_name FROM blog_posts p LEFT JOIN blog_categories c ON c.id=p.category_id ${where} ORDER BY COALESCE(p.published_at, p.created_at) DESC LIMIT ? OFFSET ?`,
      limit, off
    ).map(mapPost);
    const total = (row<{ c: number }>(`SELECT COUNT(*) as c FROM blog_posts p ${where}`)?.c ?? 0);
    return { items, total };
  },
  getBySlug(slug: string, publishedOnly = true) {
    const r = publishedOnly
      ? row(`SELECT p.*, c.slug as category_slug FROM blog_posts p LEFT JOIN blog_categories c ON c.id=p.category_id WHERE p.slug=? AND p.status='published'`, slug)
      : row(`SELECT p.*, c.slug as category_slug FROM blog_posts p LEFT JOIN blog_categories c ON c.id=p.category_id WHERE p.slug=?`, slug);
    return r ? mapPost(r) : undefined;
  },
  getById(id: string) {
    const r = row('SELECT * FROM blog_posts WHERE id=?', id);
    return r ? mapPost(r) : undefined;
  },
  create(data: any) {
    const id = randomUUID();
    run(
      'INSERT INTO blog_posts (id, slug, title, content, excerpt, category_id, tags, author_user_id, featured_image, seo_title, seo_description, status, published_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      id, data.slug, data.title, data.content, data.excerpt ?? null, data.category_id ?? null,
      JSON.stringify(data.tags ?? []), data.author_user_id ?? null, data.featured_image ?? null,
      data.seo_title ?? null, data.seo_description ?? null, data.status ?? 'draft',
      data.status === 'published' ? (data.published_at ?? now()) : null, now(), now()
    );
    return BlogPosts.getById(id);
  },
  update(id: string, data: any) {
    const cur = BlogPosts.getById(id) as any;
    if (!cur) return undefined;
    const next = { ...cur, ...data };
    run(
      'UPDATE blog_posts SET slug=?, title=?, content=?, excerpt=?, category_id=?, tags=?, featured_image=?, seo_title=?, seo_description=?, status=?, published_at=?, updated_at=? WHERE id=?',
      next.slug, next.title, next.content, next.excerpt ?? null, next.category_id ?? null,
      typeof next.tags === 'string' ? next.tags : JSON.stringify(next.tags ?? []),
      next.featured_image ?? null, next.seo_title ?? null, next.seo_description ?? null,
      next.status, next.status === 'published' ? (next.published_at ?? now()) : null, now(), id
    );
    return BlogPosts.getById(id);
  },
  remove(id: string) {
    run('DELETE FROM blog_posts WHERE id=?', id);
  },
};

function mapPost(r: any) {
  return { ...r, tags: parseJson(r.tags, []) };
}

// ---------- Settings ----------
export const Settings = {
  all() {
    const rows = all('SELECT key, value, updated_at FROM system_settings');
    const out: Record<string, any> = {};
    for (const r of rows) {
      try {
        out[r.key] = JSON.parse(r.value);
      } catch {
        out[r.key] = r.value;
      }
    }
    return out;
  },
  get(key: string) {
    const r = row<{ value: string }>('SELECT value FROM system_settings WHERE key=?', key);
    if (!r) return undefined;
    try {
      return JSON.parse(r.value);
    } catch {
      return r.value;
    }
  },
  set(key: string, value: unknown) {
    run('INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at', key, JSON.stringify(value), now());
  },
};
