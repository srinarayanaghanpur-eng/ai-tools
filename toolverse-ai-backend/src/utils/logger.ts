import pino from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (env.IS_PROD ? 'info' : 'debug'),
  // Pretty transport is opt-in (PINO_PRETTY=1) to avoid requiring pino-pretty in test/prod.
  transport:
    process.env.PINO_PRETTY === '1' && !env.IS_PROD
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
      : undefined,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.token',
      '*.apiKey',
      '*.secret',
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
    ],
    censor: '[REDACTED]',
  },
});
