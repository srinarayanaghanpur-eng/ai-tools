/** Standalone worker process: `npm run worker`. Shares the same SQLite DB. */
import { migrate } from './db/migrate.js';
import { syncToolsToDb } from './tools/sync.js';
import { jobQueue } from './jobs/queue.js';
import { executeJob } from './jobs/pipeline.js';
import { logger } from './utils/logger.js';

async function main() {
  await migrate();
  syncToolsToDb();
  jobQueue.startPolling(async (job) => {
    await executeJob(job);
  }, 500);
  logger.info('TOOLVERSE worker started (polling QUEUED jobs)');
}

main().catch((e) => {
  logger.error({ err: e }, 'worker fatal');
  process.exit(1);
});
