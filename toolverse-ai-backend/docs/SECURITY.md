# Security Review & Mitigations

Covered: auth, authorization, uploads, path traversal, injection, SSRF, rate limiting, secrets, admin, validation, unsafe processing.

## What was implemented

- **Auth**: bcrypt(12) passwords; short-lived JWT (15m) + rotating opaque refresh tokens (HttpOnly, `SameSite=Lax`, path-scoped); sessions table with revocation; password-reset tokens are SHA-256 hashes with 1h expiry; API keys stored as SHA-256 hashes, shown once.
- **Authorization**: `optionalAuth` (JWT or `tv_` key) → `requireAuth` → `requireAdmin`. Jobs scoped: private jobs 404 for non-owners (no IDOR leak); downloads need ownership or HMAC signed token (`SIGNED_URL_SECRET`, timing-safe compare, expiry).
- **Uploads**: multer to isolated `os.tmpdir()/toolverse-uploads` (not storage root); per-tool extension allowlist + `file-type` magic-byte sniffing + size caps; executables blocked; random UUID storage keys; original names sanitized via `basename` + charset strip; uploads never executed; `X-Content-Type-Options: nosniff` on downloads; `Content-Disposition: attachment`.
- **Path traversal**: `safeJoin()` asserts resolved path stays under storage root; keys reject `..`; `sanitizeBasename()` on all user filenames; processor outputs written to fresh `mkdtemp` dirs with `0o600`.
- **Injection**: all DB access via parameterized `DatabaseSync.prepare(...).get/run/all` (no string concat except static IN-lists of validated enums); `zod` validation on bodies/queries; admin settings keys allowlisted by regex; LibreOffice/ffmpeg/poppler invoked via `execFile` (no shell) with timeouts and allowlisted args.
- **SSRF**: `assertPublicHttpUrl()` blocks private/loopback/link-local IPs + `.internal/.local` + credentialed URLs and verifies DNS A/AAAA before any server-side fetch of user URLs.
- **Rate limiting**: `express-rate-limit` per surface (auth 30/15m; upload 60/15m; process 50/h; AI 20/h; download 200/15m; api 300/15m) scaled by tier (anon×1, free×3, premium×10, admin×50), keyed by user-id or IP.
- **Secrets**: env-only (`dotenv`); pino `redact` for tokens/passwords/keys; error middleware logs full detail server-side but returns `{code,message}` with no stacks; prod boot refuses weak `JWT_SECRET`/`SIGNED_URL_SECRET`.
- **Admin**: separate router behind `requireAdmin`; role stored server-side from JWT (not client); user-role updates via allowlisted enum.
- **Validation**: zod on auth/blog/admin/user queries; file tools validate count/size/ext/MIME; text tools cap length (500k input, 2MB JSON); numeric params clamped (quality, CRF, DPI, dimensions).
- **Unsafe processing**: PDFs via `pdf-lib` `ignoreEncryption`; images via `sharp(failOnError:false).rotate()` (no EXIF exec); media via `ffmpeg-static` binary (no system shell); DOCX text via `mammoth` (no macros run); size/timeout caps per tool; `AbortController` cancels runaway jobs.

## Residual risks / operator duties

- SQLite is single-writer: for multi-host scale, move to Postgres + shared object storage (S3) and `SKIP LOCKED` claiming.
- `sharp`/`ffmpeg` parse untrusted bytes: keep deps updated (`npm audit`), run workers with least privilege, and set `MAX_UPLOAD_MB` conservatively.
- AI keys have spend: keep `aiLimiter` tight and monitor `usage.ai_tokens`.
- Set `COOKIE_SECURE=true` + HTTPS + `CORS_ORIGINS` allowlist in production.
- Back up `DATABASE_PATH` and rotate `JWT_SECRET`/`SIGNED_URL_SECRET` per policy (rotating invalidates sessions/signed URLs by design).
