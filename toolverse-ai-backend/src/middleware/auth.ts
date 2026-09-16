import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../services/auth.js';
import { Users, ApiKeys } from '../db/repositories.js';
import { Errors } from '../errors.js';
import { sha256Hex } from '../utils/crypto.js';

export interface AuthUser {
  id: string;
  email: string;
  role: 'anonymous' | 'free' | 'premium' | 'admin';
  plan?: string;
  viaApiKey?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser | undefined;
    }
  }
}

function bearer(req: Request): string | null {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return null;
  return h.slice(7).trim() || null;
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    // 1) API key (tv_xxx)
    const apiKeyRaw = (req.headers['x-api-key'] as string) || '';
    if (apiKeyRaw.startsWith('tv_')) {
      const hash = sha256Hex(apiKeyRaw);
      const record = ApiKeys.getByHash(hash) as any;
      if (record) {
        if (record.expires_at && new Date(record.expires_at).getTime() < Date.now()) {
          throw Errors.unauthorized('API key expired');
        }
        const u = Users.getById(record.user_id) as any;
        if (u) {
          ApiKeys.touch(record.id);
          req.user = { id: u.id, email: u.email, role: u.role, plan: u.plan, viaApiKey: true };
          return next();
        }
      }
      throw Errors.unauthorized('Invalid API key');
    }
    // 2) JWT
    const token = bearer(req);
    if (token) {
      const payload = verifyAccessToken(token);
      const u = Users.getById(payload.sub) as any;
      if (!u) throw Errors.unauthorized('User not found');
      req.user = { id: u.id, email: u.email, role: u.role, plan: u.plan };
      return next();
    }
    return next();
  } catch (e) {
    return next(e);
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user?.id) return next(Errors.unauthorized());
  return next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user?.id) return next(Errors.unauthorized());
  if (req.user.role !== 'admin') return next(Errors.forbidden('Admin access required'));
  return next();
}
