import cron from 'node-cron';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { getDb } from '../db/connection.js';
import { Files, Jobs } from '../db/repositories.js';
import { getStorage } from '../services/storage/index.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export async function runCleanupOnce(): Promise<{ files: number; jobs: number; tmp: number }> {
  const nowIso = new Date().toISOString();
  let removedFiles = 0;
  let removedJobs = 0;
  let tmpCleaned = 0;

  // 1) Expired file objects (storage + rows)
  try {
    const expired = Files.listExpired(nowIso);
    const storage = getStorage();
    for (const f of expired as any[]) {
      try {
        await storage.remove(f.stored_key);
      } catch (e) {
        logger.warn({ err: e, key: f.stored_key }, 'cleanup storage remove failed');
      }
      Files.deleteById(f.id);
      removedFiles++;
    }
  } catch (e) {
    logger.error({ err: e }, 'cleanup expired files failed');
  }

  // 2) Old job records beyond retention
  try {
    const cutoff = new Date(Date.now() - env.JOB_RETENTION_DAYS * 24 * 3600 * 1000).toISOString();
    const db = getDb();
    const oldJobs = db.prepare("SELECT id FROM jobs WHERE created_at < ? AND status IN ('COMPLETED','FAILED','CANCELLED')").all(cutoff) as any[];
    const storage = getStorage();
    for (const j of oldJobs) {
      const files = db.prepare('SELECT * FROM files WHERE job_id=?').all(j.id) as any[];
      for (const f of files) {
        try {
          await storage.remove(f.stored_key);
        } catch { /* ignore */ }
      }
      db.prepare('DELETE FROM files WHERE job_id=?').run(j.id);
      db.prepare('DELETE FROM jobs WHERE id=?').run(j.id);
      removedJobs++;
    }
    // Also purge jobs table count safety: delete FAILED older than 24h regardless? covered by retention.
    void Jobs;
  } catch (e) {
    logger.error({ err: e }, 'cleanup old jobs failed');
  }

  // 3) Orphan multer tmp files older than 2h
  try {
    const dir = path.join(os.tmpdir(), 'toolverse-uploads');
    const entries = await fs.readdir(dir).catch(() => []);
    for (const name of entries) {
      const p = path.join(dir, name);
      try {
        const st = await fs.stat(p);
        if (Date.now() - st.mtimeMs > 2 * 3600 * 1000) {
          await fs.unlink(p).catch(() => undefined);
          tmpCleaned++;
        }
      } catch { /* ignore */ }
    }
    for (const sub of ['toolverse-outputs', 'toolverse-work-']) {
      // tv-work dirs are created via mkdtemp (tv-work-*) and outputs as files; clean stale >6h
      const tmpRoot = os.tmpdir();
      const all = await fs.readdir(tmpRoot).catch(() => []);
      for (const name of all) {
        if (!name.startsWith(sub === 'toolverse-work-' ? 'tv-work-' : 'toolverse-') && !name.startsWith('tv-')) continue;
        const p = path.join(tmpRoot, name);
        try {
          const st = await fs.stat(p);
          if (Date.now() - st.mtimeMs > 6 * 3600 * 1000) {
            await fs.rm(p, { recursive: true, force: true }).catch(() => undefined);
            tmpCleaned++;
          }
        } catch { /* ignore */ }
      }
    }
  } catch (e) {
    logger.error({ err: e }, 'cleanup tmp failed');
  }

  logger.info({ removedFiles, removedJobs, tmpCleaned }, 'cleanup run');
  return { files: removedFiles, jobs: removedJobs, tmp: tmpCleaned };
}

export function startCleanupCron() {
  const expr = env.CLEANUP_CRON || '*/30 * * * *';
  if (!cron.validate(expr)) {
    logger.warn({ expr }, 'invalid CLEANUP_CRON, using default');
    cron.schedule('*/30 * * * *', () => runCleanupOnce().catch(() => undefined));
    return;
  }
  cron.schedule(expr, () => runCleanupOnce().catch((e) => logger.error({ err: e }, 'scheduled cleanup failed')));
  logger.info({ expr }, 'cleanup cron scheduled');
}
