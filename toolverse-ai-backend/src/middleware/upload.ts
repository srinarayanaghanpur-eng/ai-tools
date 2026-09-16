import multer from 'multer';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { env } from '../config/env.js';

// Isolated temp upload dir (never the storage root directly)
const uploadDir = path.join(os.tmpdir(), 'toolverse-uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const maxBytes = () => {
  const mb = Math.max(env.MAX_UPLOAD_MB, env.MAX_VIDEO_MB);
  return mb * 1024 * 1024;
};

export const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: maxBytes(),
    files: 10,
    fields: 20,
  },
  fileFilter: (_req, file, cb) => {
    // Block executables / scripts at the gate (deeper MIME check happens per-tool)
    const blocked = /\.(exe|dll|bat|cmd|com|scr|ps1|sh|js|jar|msi|apk|dmg)$/i;
    if (blocked.test(file.originalname)) {
      return cb(new Error('File type not allowed'));
    }
    // originalname path traversal guard
    if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
      // multer keeps originalname as sent; we sanitize later — don't reject, just continue
    }
    cb(null, true);
  },
});

export function tempFilePath(): string {
  return path.join(uploadDir, `tmp-${crypto.randomUUID()}`);
}
