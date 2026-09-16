# TOOLVERSE AI — Backend (API only)

Production-ready backend for an all-in-one AI tools + file-converter platform. No frontend. A separate frontend consumes these REST APIs.

## Quick start

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run dev        # API on http://localhost:4000
npm run worker     # optional separate worker (same DB)
```

Docs:
- Swagger UI: `GET /api/docs`
- OpenAPI JSON: `GET /api/openapi.json`
- Full guide: [`docs/API.md`](docs/API.md), [`docs/ADD_TOOL.md`](docs/ADD_TOOL.md), [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md), [`docs/SECURITY.md`](docs/SECURITY.md)

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | API + in-process workers (watch) |
| `npm run build` / `npm start` | Compile + run production API |
| `npm run worker` | Standalone worker process |
| `npm run db:migrate` | Create tables + seed admin/blog |
| `npm test` | Backend test suite (vitest + supertest) |

## Adding a new tool (no route changes)

1. Implement a `Processor` in `src/tools/processors/<category>/`.
2. Register a `ToolDefinition` in `src/tools/registry.ts`.
3. Restart — it auto-syncs to DB and appears in `GET /api/tools` + OpenAPI.

See [`docs/ADD_TOOL.md`](docs/ADD_TOOL.md). Converters live in `src/tools/converters/` behind `BaseConverter`.

## Adding an AI provider

Implement `AIProvider` in `src/services/ai/` and return it from `getAIProvider()`. Switch via `AI_PROVIDER=openai|anthropic|google`. Keys come from env only — never from clients.

## Production notes

- Set `STORAGE_PROVIDER=s3` + S3 env for object storage; default `local`.
- SQLite (`DATABASE_PATH`) for single-instance; point to persistent volume. Schema is in `src/db/schema.ts` and portable to Postgres.
- Run `npm run worker` as a separate service for scale; run cleanup cron (built-in) or `POST /api/admin/cleanup`.
- Required prod env: `JWT_SECRET`, `SIGNED_URL_SECRET` (≥32 chars), `CORS_ORIGINS`, AI keys for AI tools, `ADMIN_EMAIL`/`ADMIN_PASSWORD` bootstrap.
