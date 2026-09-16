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

## Earning with ads

## SEO (traffic pulling)

- Per-page metadata (title/description/canonical/OG/Twitter) on homepage, tools directory, all tool pages, categories, blog + articles.
- 7 static category landing pages (`/categories/[slug]`) with unique copy + FAQs.
- JSON-LD everywhere: SoftwareApplication + BreadcrumbList + FAQPage on tools, CollectionPage on categories, Article on posts.
- `/sitemap.xml` (static + tools + categories + blog posts), `/robots.txt`, `/rss.xml`, static OG image (`public/og-image.png`).
- Set `NEXT_PUBLIC_SITE_URL` to the production domain before deploying, or canonicals/OG/sitemap will point at localhost.

The frontend ships an ad system ready for Google AdSense (or any display network later):

1. Sign up at Google AdSense, add your site, and get approved (requires real content + traffic — the blog helps here).
2. Copy your publisher ID and ad-unit IDs into `.env`:
   `NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-...` plus the six `NEXT_PUBLIC_AD_SLOT_*` IDs.
3. Rebuild/redeploy. `/ads.txt` is served automatically for verification.
4. Placements: homepage ×2, tools directory, below every tool runner, blog list, below articles. No ads on auth/dashboard pages (better policy standing + UX).

Rules that keep your account alive: never click your own ads or ask users to, keep the Privacy Policy + cookie banner (both built in — consent is required before any ad loads), and don't place ads on error/empty pages.

## Structure

- `app/` — homepage, `/tools`, `/tools/[slug]` (reusable runner), auth, `/dashboard/*`, `/blog`
- `components/` — Navbar, Footer, ToolCard/Grid, ToolSearch (Ctrl+K), CategoryCard, UploadZone, JobStatus, LocalTool, Sidebar, BlogCard, ui
- `lib/` — `api.ts` (central client), `tools.ts` (frontend registry), `utils.ts`, `hooks.ts`
