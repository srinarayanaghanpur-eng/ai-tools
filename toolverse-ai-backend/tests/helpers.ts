import { beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { migrate } from '../src/db/migrate.js';
import { syncToolsToDb } from '../src/tools/sync.js';
import { jobQueue } from '../src/jobs/queue.js';
import { executeJob } from '../src/jobs/pipeline.js';
import { closeDb } from '../src/db/connection.js';

export let app: any;

beforeAll(async () => {
  // Fresh DB per test file run
  const dbPath = process.env.DATABASE_PATH!;
  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    try {
      fs.unlinkSync(dbPath + suffix);
    } catch { /* ignore */ }
  }
  try {
    fs.rmSync(process.env.STORAGE_LOCAL_ROOT!, { recursive: true, force: true });
  } catch { /* ignore */ }
  closeDb();
  await migrate();
  syncToolsToDb();
  app = createApp();
  jobQueue.startPolling(async (job) => executeJob(job), 100);
}, 60_000);

afterAll(async () => {
  jobQueue.stop();
  closeDb();
});

export function api() {
  return request(app);
}

export async function registerAndLogin(email = `u${Date.now()}${Math.floor(Math.random() * 1e6)}@t.local`, password = 'Password123!', name = 'Test') {
  const reg = await api().post('/api/auth/register').send({ email, password, name });
  if (reg.status !== 201) throw new Error(`register failed: ${reg.status} ${JSON.stringify(reg.body)}`);
  const login = await api().post('/api/auth/login').send({ email, password });
  if (login.status !== 200) throw new Error(`login failed: ${login.status} ${JSON.stringify(login.body)}`);
  return { user: login.body.data.user, token: login.body.data.accessToken as string };
}

export const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

export async function waitForJob(jobId: string, token?: string, timeoutMs = 60_000): Promise<any> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const r = await api().get(`/api/jobs/${jobId}`).set(token ? authHeader(token) : {});
    if (r.status !== 200) throw new Error(`poll failed: ${r.status} ${JSON.stringify(r.body)}`);
    const st = r.body.data.job.status;
    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(st)) return r.body.data.job;
    await new Promise((res) => setTimeout(res, 300));
  }
  throw new Error(`timed out waiting for job ${jobId}`);
}
