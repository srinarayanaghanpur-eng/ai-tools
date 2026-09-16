import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Users, Sessions, sanitizeUser } from '../db/repositories.js';
import { Errors } from '../errors.js';
import { sha256Hex } from '../utils/crypto.js';

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 12);
}

export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

export function signAccessToken(user: { id: string; email: string; role: string }): string {
  return (jwt as any).sign(
    { sub: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

export function verifyAccessToken(token: string): { sub: string; email: string; role: string } {
  try {
    return (jwt as any).verify(token, env.JWT_SECRET) as any;
  } catch {
    throw Errors.unauthorized('Invalid or expired token');
  }
}

export function createRefreshToken(): { token: string; hash: string; expiresAt: string } {
  const token = crypto.randomBytes(48).toString('hex');
  const hash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + env.REFRESH_DAYS * 24 * 3600 * 1000).toISOString();
  return { token, hash, expiresAt };
}

export async function registerUser(email: string, password: string, name?: string) {
  if (Users.getByEmail(email)) throw Errors.conflict('Email already registered');
  if (password.length < 8) throw Errors.validation('Password must be at least 8 characters');
  const hash = await hashPassword(password);
  const user = Users.create({ email, password_hash: hash, name });
  return sanitizeUser(user);
}

export async function loginUser(email: string, password: string, meta?: { userAgent?: string; ip?: string }) {
  const user = Users.getByEmail(email) as any;
  if (!user) throw Errors.unauthorized('Invalid credentials');
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) throw Errors.unauthorized('Invalid credentials');
  const accessToken = signAccessToken(user);
  const rt = createRefreshToken();
  Sessions.create({
    user_id: user.id,
    refresh_token_hash: rt.hash,
    user_agent: meta?.userAgent,
    ip: meta?.ip,
    expires_at: rt.expiresAt,
  });
  return { user: sanitizeUser(user), accessToken, refreshToken: rt.token, refreshExpiresAt: rt.expiresAt };
}

export function createPasswordResetToken(): { token: string; hash: string; expiresAt: string } {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, hash: sha256Hex(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() };
}
