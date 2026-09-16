# TOOLVERSE AI — ai-tool

All-in-one AI tools + file-converter platform. Monorepo with two apps:

| App | Dir | Description |
|---|---|---|
| Backend | `toolverse-ai-backend/` | Node + Express + TypeScript REST API. Tool registry, file converters (image/PDF/document/media), AI provider abstraction (OpenAI/Anthropic/Google), job queue + workers, auth, admin + blog APIs, OpenAPI docs. |
| Frontend | `toolverse-ai-frontend/` | Next.js 14 premium UI. Homepage, 54 tool pages, global search (Ctrl+K), auth, dashboard (jobs/files/favorites/usage), blog. Consumes the backend via `NEXT_PUBLIC_API_URL`. No processing or secrets live here. |

## Quick start

```bash
# Backend (http://localhost:4000)
cd toolverse-ai-backend
cp .env.example .env   # add AI keys, strong JWT secrets
npm install
npm run db:migrate
npm run dev

# Frontend (http://localhost:3000)
cd ../toolverse-ai-frontend
cp .env.example .env   # set NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev
```

Each app has its own README with full docs (`toolverse-ai-backend/README.md`, `docs/`, `toolverse-ai-frontend/README.md`).

## Deploy

- **Frontend → Netlify:** import this repo, base directory `toolverse-ai-frontend`
  (see `netlify.toml`), env: `NEXT_PUBLIC_SITE_URL=https://tools-agi.netlify.app`,
  `NEXT_PUBLIC_API_URL=<public backend URL>`.
- **Backend → Render:** use `render.yaml` (Blueprint), then set `CORS_ORIGINS` to the
  Netlify domain and add a disk for `./data` in production.

## Verified state

- Backend: 44 tools registered, 29/34 non-AI tools verified end-to-end via live API (COMPLETED + downloads), `npm test` 28/28 green. The 5 AI tools require provider API keys.
- Frontend: `npm run build` + `npm run lint` clean, 54 static tool pages.
