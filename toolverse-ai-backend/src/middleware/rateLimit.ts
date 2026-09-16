import rateLimit from 'express-rate-limit';
import type { Request } from 'express';

/**
 * Tiered rate limits. Resolves tier from authenticated user, else anonymous.
 * Limits (per 15 min window unless noted):
 * - anonymous: strict, free: normal, premium: generous, admin: very generous
 */
function tier(req: Request): 'anonymous' | 'free' | 'premium' | 'admin' {
  const r = (req as any).user?.role;
  if (r === 'admin') return 'admin';
  if (r === 'premium') return 'premium';
  if (r === 'free') return 'free';
  return 'anonymous';
}

const MULTIPLIER: Record<string, number> = {
  anonymous: 1,
  free: 3,
  premium: 10,
  admin: 50,
};

function tieredMax(base: number) {
  return (req: Request) => Math.ceil(base * (MULTIPLIER[tier(req)] ?? 1));
}

function key(req: Request) {
  return (req as any).user?.id ? `u:${(req as any).user.id}` : `ip:${req.ip}`;
}

function handler(_req: any, res: any) {
  res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests, slow down.' } });
}

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: tieredMax(300),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: key,
  handler,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // strict for login/register regardless of tier
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => `auth:${req.ip}`,
  handler,
});

export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: tieredMax(60),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: key,
  handler,
});

export const processLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: tieredMax(50),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: key,
  handler,
});

export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: tieredMax(20),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: key,
  handler,
});

export const downloadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: tieredMax(200),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: key,
  handler,
});
