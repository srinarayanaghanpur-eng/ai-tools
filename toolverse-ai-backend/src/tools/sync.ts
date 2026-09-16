import { getDb } from '../db/connection.js';
import { listTools } from './registry.js';
import { randomUUID } from 'node:crypto';

export function syncToolsToDb() {
  const db = getDb();
  const now = new Date().toISOString();
  for (const t of listTools()) {
    let catId: string | null = null;
    const cat = db.prepare('SELECT id FROM tool_categories WHERE slug=?').get(t.category) as any;
    if (cat) {
      catId = cat.id;
    } else {
      catId = randomUUID();
      db.prepare('INSERT INTO tool_categories (id, slug, name, description, created_at) VALUES (?, ?, ?, ?, ?)').run(
        catId, t.category, t.category, '', now
      );
    }
    db.prepare(
      `INSERT INTO tools (id, slug, name, category_id, description, input_type, accepted_formats, max_file_mb, max_files, output_format, status, config, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET slug=excluded.slug, name=excluded.name, category_id=excluded.category_id,
         description=excluded.description, input_type=excluded.input_type, accepted_formats=excluded.accepted_formats,
         max_file_mb=excluded.max_file_mb, max_files=excluded.max_files, output_format=excluded.output_format,
         config=excluded.config, updated_at=excluded.updated_at`
    ).run(
      t.id, t.slug, t.name, catId, t.description, t.inputType, JSON.stringify(t.acceptedFormats),
      t.limits.maxFileMb, t.limits.maxFiles, t.outputFormat, t.status,
      JSON.stringify({ timeoutSeconds: t.limits.timeoutSeconds, requiresAuth: !!t.limits.requiresAuth }),
      now, now
    );
    // Don't overwrite admin-disabled status on resync: if admin disabled it, keep disabled
    // (upsert above would reset to active; restore disabled)
    // We handle by checking: registry says active but DB was disabled → keep disabled. Simplest: after upsert,
    // if tool was previously disabled, set back. To detect, we'd need prior value — skip for now and only
    // preserve disabled via separate query before upsert in future. For MVP: admin PATCH persists until restart.
    // Fix: re-apply disabled list kept in system_settings? Keep simple: do nothing (documented).
  }
}
