import { createApp } from './app.js';
import { env } from './config/env.js';
import { migrate } from './db/migrate.js';
import { syncToolsToDb } from './tools/sync.js';
import { jobQueue } from './jobs/queue.js';
import { executeJob } from './jobs/pipeline.js';
import { startCleanupCron } from './jobs/cleanup.js';
import { logger } from './utils/logger.js';

async function main() {
  await migrate();
  syncToolsToDb();

  // Start background workers (in-process; scale via WORKER_CONCURRENCY / separate processes running worker.ts)
  jobQueue.startPolling(async (job) => {
    await executeJob(job);
  }, 500);
  startCleanupCron();

  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, `TOOLVERSE AI backend listening on :${env.PORT}`);
  });
}

// Only auto-run when executed directly (not when imported by tests)
const isMain = process.argv[1]?.replace(/\\/g, '/').endsWith('server.ts') || process.argv[1]?.endsWith('server.js');
if (isMain || process.env.TV_AUTOSTART === '1') {
  main().catch((e) => {
    logger.error({ err: e }, 'fatal boot error');
    process.exit(1);
  });
}

export { main };
