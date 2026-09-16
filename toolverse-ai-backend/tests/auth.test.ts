import { describe, it, expect } from 'vitest';
import { api, registerAndLogin, authHeader } from './helpers.js';

describe('auth', () => {
  it('registers, logs in, and returns me', async () => {
    const email = `auth${Date.now()}@t.local`;
    const reg = await api().post('/api/auth/register').send({ email, password: 'Password123!', name: 'A' });
    expect(reg.status).toBe(201);
    expect(reg.body.data.user.email).toBe(email);
    expect(reg.body.data.user.password_hash).toBeUndefined();

    const login = await api().post('/api/auth/login').send({ email, password: 'Password123!' });
    expect(login.status).toBe(200);
    expect(login.body.data.accessToken).toBeTypeOf('string');

    const me = await api().get('/api/auth/me').set(authHeader(login.body.data.accessToken));
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe(email);
  });

  it('rejects bad credentials with UNAUTHORIZED (no enumeration leak beyond message)', async () => {
    const r = await api().post('/api/auth/login').send({ email: 'nope@t.local', password: 'wrong' });
    expect(r.status).toBe(401);
    expect(r.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects invalid registration with VALIDATION_ERROR', async () => {
    const r = await api().post('/api/auth/register').send({ email: 'bad', password: 'short' });
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('requires auth for /me', async () => {
    const r = await api().get('/api/auth/me');
    expect(r.status).toBe(401);
  });

  it('forgot/reset flow works in test env', async () => {
    const { user } = await registerAndLogin();
    void user;
    // use fresh email
    const email = `reset${Date.now()}@t.local`;
    await api().post('/api/auth/register').send({ email, password: 'Password123!' });
    const f = await api().post('/api/auth/forgot-password').send({ email });
    expect(f.status).toBe(200);
    expect(f.body.data.resetToken).toBeTypeOf('string');
    const reset = await api().post('/api/auth/reset-password').send({ token: f.body.data.resetToken, password: 'Newpass123!' });
    expect(reset.status).toBe(200);
    const login = await api().post('/api/auth/login').send({ email, password: 'Newpass123!' });
    expect(login.status).toBe(200);
  });
});
