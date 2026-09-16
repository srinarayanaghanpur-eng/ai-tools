import dotenv from 'dotenv';
dotenv.config();

function num(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function str(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

export const env = {
  NODE_ENV: str('NODE_ENV', 'development'),
  IS_PROD: (process.env.NODE_ENV ?? 'development') === 'production',
  PORT: num('PORT', 4000),
  API_BASE_URL: str('API_BASE_URL', 'http://localhost:4000'),
  FRONTEND_URL: str('FRONTEND_URL', 'http://localhost:3000'),
  DATABASE_PATH: str('DATABASE_PATH', './data/toolverse.sqlite'),

  JWT_SECRET: str('JWT_SECRET', 'dev-only-change-me-please-32-chars-min'),
  JWT_EXPIRES_IN: str('JWT_EXPIRES_IN', '15m'),
  REFRESH_DAYS: num('REFRESH_TOKEN_EXPIRES_IN_DAYS', 30),
  SIGNED_URL_SECRET: str('SIGNED_URL_SECRET', 'dev-signed-url-secret-32-chars-min'),
  SIGNED_URL_TTL: num('SIGNED_URL_TTL_SECONDS', 3600),
  COOKIE_SECURE: str('COOKIE_SECURE', 'false') === 'true',
  CORS_ORIGINS: str('CORS_ORIGINS', 'http://localhost:3000').split(',').map(s => s.trim()).filter(Boolean),

  STORAGE_PROVIDER: str('STORAGE_PROVIDER', 'local') as 'local' | 's3',
  STORAGE_LOCAL_ROOT: str('STORAGE_LOCAL_ROOT', './storage'),
  S3_BUCKET: str('S3_BUCKET', ''),
  S3_REGION: str('S3_REGION', 'auto'),
  S3_ENDPOINT: str('S3_ENDPOINT', ''),
  S3_ACCESS_KEY_ID: str('S3_ACCESS_KEY_ID', ''),
  S3_SECRET_ACCESS_KEY: str('S3_SECRET_ACCESS_KEY', ''),
  S3_PUBLIC_BASE_URL: str('S3_PUBLIC_BASE_URL', ''),

  MAX_UPLOAD_MB: num('MAX_UPLOAD_MB', 100),
  MAX_VIDEO_MB: num('MAX_VIDEO_MB', 500),
  JOB_RETENTION_DAYS: num('JOB_RETENTION_DAYS', 7),
  FILE_TTL_HOURS: num('FILE_TTL_HOURS', 24),
  CLEANUP_CRON: str('CLEANUP_CRON', '*/30 * * * *'),

  AI_PROVIDER: str('AI_PROVIDER', 'openai') as 'openai' | 'anthropic' | 'google',
  AI_DEFAULT_MODEL: str('AI_DEFAULT_MODEL', 'gpt-4o-mini'),
  OPENAI_API_KEY: str('OPENAI_API_KEY', ''),
  OPENAI_BASE_URL: str('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
  ANTHROPIC_API_KEY: str('ANTHROPIC_API_KEY', ''),
  ANTHROPIC_BASE_URL: str('ANTHROPIC_BASE_URL', 'https://api.anthropic.com'),
  GOOGLE_AI_KEY: str('GOOGLE_GENERATIVE_AI_KEY', ''),
  GOOGLE_AI_MODEL: str('GOOGLE_GENERATIVE_AI_MODEL', 'gemini-1.5-flash'),

  LIBREOFFICE_PATH: str('LIBREOFFICE_PATH', ''),
  POPPLER_BIN_DIR: str('POPPLER_BIN_DIR', ''),
  FFMPEG_PATH: str('FFMPEG_PATH', ''),
  FFPROBE_PATH: str('FFPROBE_PATH', ''),

  ADMIN_EMAIL: str('ADMIN_EMAIL', 'admin@toolverse.ai'),
  ADMIN_PASSWORD: str('ADMIN_PASSWORD', ''),
};

if (env.IS_PROD) {
  const weak = ['dev-only-change-me', 'change-me', 'dev-signed-url'];
  for (const k of ['JWT_SECRET', 'SIGNED_URL_SECRET'] as const) {
    const v: string = (env as any)[k] ?? '';
    if (v.length < 32 || weak.some(w => v.includes(w))) {
      // eslint-disable-next-line no-console
      console.error(`[security] ${k} must be >=32 chars and not default in production.`);
      process.exit(1);
    }
  }
}
