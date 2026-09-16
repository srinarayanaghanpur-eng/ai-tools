import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { registerUser, loginUser, createPasswordResetToken, hashPassword } from '../services/auth.js';
import { Users, Sessions, sanitizeUser } from '../db/repositories.js';
import { Errors } from '../errors.js';
import { created, ok } from '../utils/responses.js';
import { sha256Hex } from '../utils/crypto.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const router = Router();
router.use(optionalAuth);

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().max(100).optional(),
});
const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});

function setRefreshCookie(res: any, token: string, expiresAt: string) {
  res.cookie('tv_refresh', token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    path: '/api/auth',
    expires: new Date(expiresAt),
  });
}

router.post('/register', authLimiter, validateBody(registerSchema), async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    const user = await registerUser(email, password, name);
    logger.info({ email }, 'user registered');
    return created(res, { user });
  } catch (e) {
    return next(e);
  }
});

router.post('/login', authLimiter, validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const out = await loginUser(email, password, { userAgent: req.headers['user-agent'], ip: req.ip });
    setRefreshCookie(res, out.refreshToken, out.refreshExpiresAt);
    return ok(res, { user: out.user, accessToken: out.accessToken });
  } catch (e) {
    return next(e);
  }
});

router.post('/refresh', authLimiter, async (req, res, next) => {
  try {
    const raw = (req.cookies?.tv_refresh as string) || (req.body?.refreshToken as string);
    if (!raw) throw Errors.unauthorized('Missing refresh token');
    const hash = sha256Hex(raw);
    const sess = Sessions.getByHash(hash) as any;
    if (!sess || new Date(sess.expires_at).getTime() < Date.now()) {
      throw Errors.unauthorized('Invalid refresh token');
    }
    const user = Users.getById(sess.user_id) as any;
    if (!user) throw Errors.unauthorized('User not found');
    // rotate
    Sessions.revoke(sess.id);
    const { createRefreshToken, signAccessToken } = await import('../services/auth.js');
    const rt = createRefreshToken();
    Sessions.create({ user_id: user.id, refresh_token_hash: rt.hash, user_agent: req.headers['user-agent'], ip: req.ip, expires_at: rt.expiresAt });
    setRefreshCookie(res, rt.token, rt.expiresAt);
    return ok(res, { accessToken: signAccessToken(user), user: sanitizeUser(user) });
  } catch (e) {
    return next(e);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const raw = (req.cookies?.tv_refresh as string) || (req.body?.refreshToken as string);
    if (raw) {
      const sess = Sessions.getByHash(sha256Hex(raw)) as any;
      if (sess) Sessions.revoke(sess.id);
    }
    res.clearCookie('tv_refresh', { path: '/api/auth' });
    return ok(res, { loggedOut: true });
  } catch (e) {
    return next(e);
  }
});

router.post('/forgot-password', authLimiter, validateBody(z.object({ email: z.string().email() })), async (req, res, next) => {
  try {
    const user = Users.getByEmail(req.body.email) as any;
    // Always return ok to avoid account enumeration
    if (user) {
      const t = createPasswordResetToken();
      Users.setReset(user.id, t.hash, t.expiresAt);
      // In production, send email. For API-only backend, log + return token only in non-prod for dev UX.
      logger.info({ userId: user.id }, 'password reset requested');
      if (!env.IS_PROD) {
        return ok(res, { message: 'Reset token created (dev only)', resetToken: t.token });
      }
    }
    return ok(res, { message: 'If the email exists, a reset link was sent.' });
  } catch (e) {
    return next(e);
  }
});

router.post('/reset-password', authLimiter, validateBody(z.object({ token: z.string().min(10), password: z.string().min(8).max(128) })), async (req, res, next) => {
  try {
    const hash = sha256Hex(req.body.token);
    const { getDb } = await import('../db/connection.js');
    const row = getDb().prepare('SELECT * FROM users WHERE reset_token_hash=?').get(hash) as any;
    if (!row || !row.reset_expires_at || new Date(row.reset_expires_at).getTime() < Date.now()) {
      throw Errors.validation('Invalid or expired reset token');
    }
    Users.updatePassword(row.id, await hashPassword(req.body.password));
    Sessions.revokeAllForUser(row.id);
    return ok(res, { message: 'Password reset successful' });
  } catch (e) {
    return next(e);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = Users.getById((req as any).user.id);
    return ok(res, { user: sanitizeUser(user) });
  } catch (e) {
    return next(e);
  }
});

export default router;
