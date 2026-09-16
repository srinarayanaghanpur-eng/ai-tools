import { randomUUID } from 'node:crypto';
import { getDb } from './connection.js';
import { SCHEMA_SQL } from './schema.js';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const now = () => new Date().toISOString();

const SEED_CATEGORIES = [
  { slug: 'image', name: 'Image', description: 'Image conversion and optimization' },
  { slug: 'pdf', name: 'PDF', description: 'PDF manipulation and extraction' },
  { slug: 'document', name: 'Documents', description: 'Office and text document conversion' },
  { slug: 'media', name: 'Video & Audio', description: 'Media transcoding and compression' },
  { slug: 'developer', name: 'Developer', description: 'Encoding, formatting and generators' },
  { slug: 'ai', name: 'AI', description: 'AI-powered text tools' },
];

export async function migrate() {
  const db = getDb();
  db.exec(SCHEMA_SQL);

  const insertCat = db.prepare(
    'INSERT OR IGNORE INTO tool_categories (id, slug, name, description, created_at) VALUES (?, ?, ?, ?, ?)'
  );
  const catIds: Record<string, string> = {};
  for (const c of SEED_CATEGORIES) {
    const existing = db.prepare('SELECT id FROM tool_categories WHERE slug = ?').get(c.slug) as any;
    if (existing) {
      catIds[c.slug] = existing.id;
    } else {
      const id = randomUUID();
      insertCat.run(id, c.slug, c.name, c.description, now());
      catIds[c.slug] = id;
    }
  }

  // Tools are seeded from registry at boot too, but ensure categories exist.
  // Bootstrap admin user
  if (env.ADMIN_EMAIL && env.ADMIN_PASSWORD) {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(env.ADMIN_EMAIL.toLowerCase()) as any;
    if (!existing) {
      const hash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
      const id = randomUUID();
      db.prepare(
        'INSERT INTO users (id, email, password_hash, name, role, plan, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(id, env.ADMIN_EMAIL.toLowerCase(), hash, 'Admin', 'admin', 'premium', now(), now());
      db.prepare('INSERT OR IGNORE INTO admin_users (id, user_id, permissions, created_at) VALUES (?, ?, ?, ?)').run(
        randomUUID(),
        id,
        JSON.stringify(['*']),
        now()
      );
      logger.info({ email: env.ADMIN_EMAIL }, 'bootstrapped admin user');
    } else {
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', existing.id);
    }
  }

  // Default system settings
  const defaults: Record<string, unknown> = {
    maintenance_mode: false,
    signup_enabled: true,
    ai_enabled: true,
    max_upload_mb: 100,
  };
  const upsert = db.prepare(
    'INSERT OR IGNORE INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)'
  );
  for (const [k, v] of Object.entries(defaults)) {
    upsert.run(k, JSON.stringify(v), now());
  }

  // Seed a welcome blog post + category if empty
  const bc = db.prepare('SELECT COUNT(*) as n FROM blog_categories').get() as any;
  if (bc.n === 0) {
    const id = randomUUID();
    db.prepare('INSERT INTO blog_categories (id, slug, name, description) VALUES (?, ?, ?, ?)').run(
      id,
      'guides',
      'Guides',
      'How-tos and converter guides'
    );
    db.prepare(
      `INSERT OR IGNORE INTO blog_posts (id, slug, title, content, excerpt, category_id, tags, seo_title, seo_description, status, published_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      randomUUID(),
      'welcome-to-toolverse-ai',
      'Welcome to TOOLVERSE AI',
      '# Welcome\n\nThis is the TOOLVERSE AI blog. Convert files and use AI tools via API.',
      'Welcome to TOOLVERSE AI blog.',
      id,
      JSON.stringify(['intro']),
      'Welcome to TOOLVERSE AI',
      'Intro post',
      'published',
      now(),
      now(),
      now()
    );
  }
}

const _isDirectRun =
  process.argv[1]?.replace(/\\/g, '/').endsWith('migrate.ts') ||
  process.argv[1]?.endsWith('migrate.js');
if (_isDirectRun) {
  migrate()
    .then(() => {
      // eslint-disable-next-line no-console
      console.log('Migration complete');
      process.exit(0);
    })
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.error(e);
      process.exit(1);
    });
}
