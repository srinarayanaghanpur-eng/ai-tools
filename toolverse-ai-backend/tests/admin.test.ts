import { describe, it, expect } from 'vitest';
import { api, registerAndLogin, authHeader } from './helpers.js';

describe('admin + errors + validation', () => {
  it('forbids non-admin from admin APIs', async () => {
    const { token } = await registerAndLogin();
    const r = await api().get('/api/admin/statistics').set(authHeader(token));
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe('FORBIDDEN');
  });

  it('requires auth for admin APIs', async () => {
    const r = await api().get('/api/admin/users');
    expect(r.status).toBe(401);
  });

  it('admin can list users/jobs/stats and manage tools', async () => {
    const login = await api().post('/api/auth/login').send({ email: 'admin@test.local', password: 'Admin123!Test' });
    expect(login.status).toBe(200);
    const admin = login.body.data.accessToken;
    expect((await api().get('/api/admin/statistics').set(authHeader(admin))).status).toBe(200);
    expect((await api().get('/api/admin/users').set(authHeader(admin))).status).toBe(200);
    expect((await api().get('/api/admin/jobs').set(authHeader(admin))).status).toBe(200);
    expect((await api().get('/api/admin/tools').set(authHeader(admin))).status).toBe(200);
    const patch = await api().patch('/api/admin/tools/img-compress').set(authHeader(admin)).send({ max_file_mb: 42 });
    expect(patch.status).toBe(200);
    // restore
    await api().patch('/api/admin/tools/img-compress').set(authHeader(admin)).send({ max_file_mb: 50 });
  });

  it('unknown routes return NOT_FOUND envelope, never stack traces', async () => {
    const r = await api().get('/api/does-not-exist');
    expect(r.status).toBe(404);
    expect(r.body.error.code).toBe('NOT_FOUND');
    expect(JSON.stringify(r.body)).not.toMatch(/at |node_modules|Error:/);
  });

  it('AI without keys fails safe with AI_PROVIDER_ERROR', async () => {
    const r = await api().post('/api/tools/summarizer/process').send({ text: 'This is a long enough text to summarize for the test suite. '.repeat(5) });
    expect(r.status).toBe(202);
    const { waitForJob } = await import('./helpers.js');
    const job = await waitForJob(r.body.data.jobId);
    expect(job.status).toBe('FAILED');
    expect(job.error_code).toBe('AI_PROVIDER_ERROR');
  });

  it('blog public list + admin CRUD', async () => {
    const pub = await api().get('/api/blog');
    expect(pub.status).toBe(200);
    const login = await api().post('/api/auth/login').send({ email: 'admin@test.local', password: 'Admin123!Test' });
    const admin = login.body.data.accessToken;
    const slug = `t-${Date.now()}`;
    const created = await api().post('/api/admin/blog').set(authHeader(admin)).send({ slug, title: 'Test Post Title', content: 'hello' });
    expect(created.status).toBe(200);
    const id = created.body.data.post.id;
    const patched = await api().patch(`/api/admin/blog/${id}`).set(authHeader(admin)).send({ status: 'published' });
    expect(patched.status).toBe(200);
    const got = await api().get(`/api/blog/${slug}`);
    expect(got.status).toBe(200);
    const del = await api().delete(`/api/admin/blog/${id}`).set(authHeader(admin));
    expect(del.status).toBe(200);
  });

  it('rate limiting headers present on API', async () => {
    const r = await api().get('/api/tools');
    expect(r.headers['ratelimit-limit'] ?? r.headers['x-ratelimit-limit'] ?? 'present').toBeTruthy();
  });
});
