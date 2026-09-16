import { EventEmitter } from 'node:events';
import { Jobs, } from '../db/repositories.js';
import { getDb } from '../db/connection.js';
import { logger } from '../utils/logger.js';

/**
 * DB-backed background queue.
 * - API enqueues by creating a QUEUED job row, then notifies workers via event.
 * - Workers poll for QUEUED jobs (ordered by created_at) and claim them atomically.
 * - Swap to BullMQ/Redis by implementing the same interface when REDIS_URL is set
 *   (interface kept small on purpose).
 */
class JobQueue extends EventEmitter {
  private polling = false;
  private pollTimer: NodeJS.Timeout | null = null;

  notify(jobId: string) {
    this.emit('job', jobId);
  }

  /** Claim next QUEUED job atomically (single-instance; for multi-instance use FOR UPDATE SKIP LOCKED on Postgres). */
  claimNext(): any | null {
    // SQLite: single writer; do a quick transaction via immediate lock using UPDATE ... WHERE status='QUEUED'
    // Simplified: select oldest QUEUED, then try to flip to PROCESSING only if still QUEUED.
    const db = getDb();
    const row = db.prepare(
      "SELECT * FROM jobs WHERE status='QUEUED' ORDER BY created_at ASC LIMIT 1"
    ).get() as any;
    if (!row) return null;
    const res = db.prepare("UPDATE jobs SET status='PROCESSING', started_at=?, progress=5 WHERE id=? AND status='QUEUED'").run(new Date().toISOString(), row.id);
    if ((res.changes as number) === 0) return null;
    return Jobs.getById(row.id);
  }

  startPolling(handler: (job: any) => Promise<void>, intervalMs = 500) {
    if (this.polling) return;
    this.polling = true;
    const tick = async () => {
      if (!this.polling) return;
      try {
        // Drain up to N per tick
        for (let i = 0; i < 5; i++) {
          const job = this.claimNext();
          if (!job) break;
          handler(job).catch((e) => logger.error({ err: e, jobId: job.id }, 'worker handler failed'));
        }
      } catch (e) {
        logger.error({ err: e }, 'queue poll failed');
      } finally {
        if (this.polling) this.pollTimer = setTimeout(tick, intervalMs);
      }
    };
    // Immediate processing on notify + background poll for robustness
    this.on('job', async (jobId: string) => {
      try {
        const db = getDb();
        const row = db.prepare('SELECT * FROM jobs WHERE id=?').get(jobId) as any;
        if (!row || row.status !== 'QUEUED') return;
        const claimed = db.prepare("UPDATE jobs SET status='PROCESSING', started_at=?, progress=5 WHERE id=? AND status='QUEUED'").run(new Date().toISOString(), jobId);
        if ((claimed.changes as number) === 0) return; // already claimed by poller
        const job = Jobs.getById(jobId);
        if (job) await handler(job);
      } catch (e) {
        logger.error({ err: e, jobId }, 'notify handler failed');
      }
    });
    this.pollTimer = setTimeout(tick, intervalMs);
  }

  stop() {
    this.polling = false;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.removeAllListeners('job');
  }
}

export const jobQueue = new JobQueue();
