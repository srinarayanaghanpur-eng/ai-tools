import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { Errors } from '../errors.js';

export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return next(Errors.validation('Invalid request body', parsed.error.flatten()));
    }
    req.body = parsed.data;
    return next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return next(Errors.validation('Invalid query parameters', parsed.error.flatten()));
    }
    (req as any).validatedQuery = parsed.data;
    return next();
  };
}
