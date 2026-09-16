import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  // Map multer / upload errors to safe client errors (never 500 for bad input)
  if (err && (err.code === 'LIMIT_FILE_SIZE' || err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE')) {
    const code = err.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : 'INVALID_FILE';
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    logger.warn({ err: err?.message, code, status }, 'upload limit');
    res.status(status).json({ success: false, error: { code, message: err.code === 'LIMIT_FILE_SIZE' ? 'File too large' : 'Invalid upload' } });
    return;
  }
  if (err && String(err.message ?? '').includes('File type not allowed')) {
    logger.warn({ err: err?.message }, 'blocked upload');
    res.status(400).json({ success: false, error: { code: 'INVALID_FILE', message: 'File type not allowed' } });
    return;
  }
  const status = err instanceof AppError ? err.status : err?.status === 429 ? 429 : 500;
  const code =
    err instanceof AppError ? err.code : status === 429 ? 'RATE_LIMITED' : 'INTERNAL_ERROR';

  // Log full technical detail internally only
  if (status >= 500) {
    logger.error({ err, code }, 'request failed');
  } else {
    logger.warn({ err: err?.message, code, status }, 'request error');
  }

  const safeMessage =
    err instanceof AppError
      ? err.message
      : env.IS_PROD
        ? 'Internal server error'
        : (err?.message ?? 'Internal server error');

  res.status(status).json({
    success: false,
    error: { code, message: safeMessage },
  });
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
}
