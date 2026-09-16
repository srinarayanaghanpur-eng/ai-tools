import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// Load node:sqlite without static import so Vite/vitest doesn't try to bundle it.
// (Static `import ... from 'node:sqlite'` fails under vitest's resolver on some versions.)
function loadDatabaseSync(): any {
  const gbm = (process as any).getBuiltinModule?.bind(process);
  if (gbm) {
    const mod = gbm('node:sqlite');
    if (mod?.DatabaseSync) return mod.DatabaseSync;
  }
  // Fallback for older resolvers: runtime require by string (not statically analyzable)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const req = (module as any)?.require ?? eval('require');
  return req('node:sqlite').DatabaseSync;
}
const DatabaseSync = loadDatabaseSync();

type DatabaseSyncType = any;

let db: DatabaseSyncType | null = null;

export function getDb(): DatabaseSyncType {
  if (db) return db;
  const dbPath = path.resolve(env.DATABASE_PATH);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 5000;');
  return db;
}

export function closeDb() {
  try {
    db?.close();
  } catch (e) {
    logger.warn({ err: e }, 'db close failed');
  }
  db = null;
}
