# Deployment

## Env

Copy `.env.example` → `.env`. Production must set:
- `NODE_ENV=production`, `PORT`, `API_BASE_URL`, `FRONTEND_URL`, `CORS_ORIGINS`
- `JWT_SECRET`, `SIGNED_URL_SECRET` (≥32 random chars; boot fails otherwise)
- `DATABASE_PATH` on a persistent volume (SQLite WAL)
- `STORAGE_PROVIDER=local` (volume at `STORAGE_LOCAL_ROOT`) or `s3` (+ `S3_BUCKET/REGION/ENDPOINT/KEYS`)
- AI: `AI_PROVIDER`, plus `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GOOGLE_GENERATIVE_AI_KEY`
- Optional: `LIBREOFFICE_PATH` (pixel-perfect DOCX→PDF), `POPPLER_BIN_DIR` (PDF→JPG raster), `FFMPEG_PATH/FFPROBE_PATH` (defaults to `ffmpeg-static`)
- `ADMIN_EMAIL`/`ADMIN_PASSWORD` (bootstrap; change immediately), `FILE_TTL_HOURS`, `JOB_RETENTION_DAYS`, `CLEANUP_CRON`

## Build & run

```bash
npm ci
npm run build
npm run db:migrate
node dist/server.js            # API + in-process workers + cleanup cron
# scale out:
node dist/worker.js            # additional worker processes (same DB/volume)
```

Docker (example):
```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist ./dist
ENV NODE_ENV=production
CMD ["node","dist/server.js"]
```
Mount `/app/data` and `/app/storage` as volumes. For S3, no volume needed for outputs.

## Database

- SQLite via `node:sqlite` (WAL, foreign keys). `src/db/schema.ts` is the DDL; `migrate()` + `syncToolsToDb()` run at boot.
- Postgres path: schema is standard SQL; swap `src/db/connection.ts` for `pg` and use `SELECT ... FOR UPDATE SKIP LOCKED` in `queue.claimNext()` for multi-instance claiming. Tables/indexes map 1:1.

## Workers & cleanup

- API returns `202 + jobId` immediately; workers poll `QUEUED` jobs and run `executeJob()`.
- Cleanup cron (`CLEANUP_CRON`, default every 30m) deletes expired files, old jobs beyond `JOB_RETENTION_DAYS`, and stale tmps. Manual: `POST /api/admin/cleanup`.

## Native-dependency notes (verified on Node 24, Windows)

- `POPPLER_BIN_DIR` may point at vendored binaries (e.g. `./vendor/poppler/.../bin`, git-ignored). Install poppler via package manager on Linux (`poppler-utils`) instead.
- `package.json → overrides` pins single copies of `sharp` and `onnxruntime-node`. Do not remove them:
  - Two different `sharp` copies (= two libvips instances) in one process crash the server (sharp + `@imgly/background-removal-node`).
  - `onnxruntime-node` < 1.22 hard-crashes (libuv assert) on Node 22+ during background-removal teardown.
- ESM-only deps (`file-type`, `pdfjs-dist`) are loaded via `src/utils/dynamicImport.ts` — plain `await import()` is downlevelled to `require()` by the CJS build and breaks in production.

## Tests & checks

```bash
npm test        # vitest + supertest (isolated test DB/storage)
npm run lint    # tsc --noEmit
```
