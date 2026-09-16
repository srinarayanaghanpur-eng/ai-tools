import fs from 'node:fs';
import path from 'node:path';

// Isolated test env — must run before any src import (vitest setupFiles).
const root = path.resolve(__dirname, '..');
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = path.join(root, 'data', `test-${process.pid}.sqlite`);
process.env.STORAGE_PROVIDER = 'local';
process.env.STORAGE_LOCAL_ROOT = path.join(root, `storage-test-${process.pid}`);
process.env.JWT_SECRET = 'test-jwt-secret-0123456789abcdef-test';
process.env.SIGNED_URL_SECRET = 'test-signed-url-secret-0123456789ab';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.OPENAI_API_KEY = '';
process.env.ANTHROPIC_API_KEY = '';
process.env.GOOGLE_GENERATIVE_AI_KEY = '';
process.env.ADMIN_EMAIL = 'admin@test.local';
process.env.ADMIN_PASSWORD = 'Admin123!Test';

// Clean stale test DB from previous crashed runs (same pid reuse unlikely, but safe)
try {
  for (const f of fs.readdirSync(path.join(root, 'data'))) {
    if (f.startsWith('test-') && f.endsWith('.sqlite')) {
      // keep current pid file; remove files older than 1h
      const p = path.join(root, 'data', f);
      const st = fs.statSync(p);
      if (Date.now() - st.mtimeMs > 3600_000) fs.unlinkSync(p);
    }
  }
} catch { /* ignore */ }
