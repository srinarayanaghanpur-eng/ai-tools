# TOOLVERSE AI — Frontend

Premium Next.js frontend for the TOOLVERSE AI platform. All processing runs in the separate backend API — this app only consumes it.

## Setup

```bash
cp .env.example .env   # set NEXT_PUBLIC_API_URL to your backend, e.g. http://localhost:4000
npm install
npm run dev            # http://localhost:3000
npm run build && npm start
```

No secrets in frontend code. Auth uses backend JWT (localStorage access token) + httpOnly refresh cookie.

## Backend contract

- `GET /api/tools`, `GET /api/tools/:slug`
- `POST /api/tools/:toolId/process` (multipart `files` or JSON `{text,...params}`) → `{jobId}`
- `GET /api/jobs/:jobId` (poll QUEUED → PROCESSING → COMPLETED/FAILED/CANCELLED)
- `GET /api/jobs/:jobId/download?fileId=` → bytes
- Auth: `/api/auth/*`; user: `/api/user/jobs|files|usage`; blog: `/api/blog*`

If the backend is unreachable, pages show explicit connection/offline states — results are never faked.

## Structure

- `app/` — homepage, `/tools`, `/tools/[slug]` (reusable runner), auth, `/dashboard/*`, `/blog`
- `components/` — Navbar, Footer, ToolCard/Grid, ToolSearch (Ctrl+K), CategoryCard, UploadZone, JobStatus, LocalTool, Sidebar, BlogCard, ui
- `lib/` — `api.ts` (central client), `tools.ts` (frontend registry), `utils.ts`, `hooks.ts`
