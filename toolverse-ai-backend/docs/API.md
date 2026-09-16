# API Reference (v1)

Base URL: `/api`. Auth: `Authorization: Bearer <jwt>` or `X-API-Key: tv_...`. Refresh token in `HttpOnly` cookie `tv_refresh` (path `/api/auth`).

Consistent envelope:
- Success: `{ "success": true, "data": {...} }` (lists add `meta: {page,limit,total,totalPages}`)
- Error: `{ "success": false, "error": { "code": "...", "message": "..." } }` — never stacks/secrets.

## Auth

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | `{email,password,name?}` | 201 |
| POST | `/api/auth/login` | `{email,password}` | sets refresh cookie, returns `accessToken` |
| POST | `/api/auth/refresh` | `{}` (cookie) | rotates refresh |
| POST | `/api/auth/logout` | — | clears cookie |
| POST | `/api/auth/forgot-password` | `{email}` | always 200 (no enumeration); dev returns `resetToken` |
| POST | `/api/auth/reset-password` | `{token,password}` | |
| GET | `/api/auth/me` | — | requires auth |

## Tools

- `GET /api/tools` → `{ tools[], categories[] }`
- `GET /api/tools/:slug`
- `POST /api/tools/:toolId/process` → `202 { jobId, status, pollUrl }`
  - File tools: `multipart/form-data`, field **`files`** (up to tool max), plus text fields or `params` JSON string.
  - Text tools: JSON `{ text, ...params }` or multipart with `text` field.
  - AI tools are additionally rate-limited (`aiLimiter`).

## Jobs

- `GET /api/jobs/:jobId` — poll; job has `jobId/userId/toolId/inputFiles/outputFiles/status/progress/error/createdAt/startedAt/completedAt` (DB uses snake_case; both shown).
- `POST /api/jobs/:jobId/cancel` — auth, owner/admin.
- `GET /api/jobs/:jobId/download?fileId=xxx[&token=downloadToken]` — owner JWT or signed `downloadToken` from `output_files[].downloadToken`. Streams bytes with `Content-Disposition: attachment`, never internal paths.

Job states: `QUEUED → PROCESSING → COMPLETED | FAILED | CANCELLED`.

## User

- `GET /api/user/jobs?page&limit&status`
- `GET /api/user/files`
- `GET /api/user/usage` — 30-day totals + daily breakdown
- `GET/POST /api/user/api-keys`, `DELETE /api/user/api-keys/:id` (raw key shown once)

## Blog (public)

- `GET /api/blog?page&limit`, `GET /api/blog/categories`, `GET /api/blog/:slug`

## Admin (`role=admin` only)

- `GET /api/admin/statistics` — users, jobs by status, storage bytes, usage totals
- `GET /api/admin/users?search`, `PATCH /api/admin/users/:id {role,plan}`
- `GET /api/admin/jobs?status&tool_id`, `GET /api/admin/jobs/failed`, `POST /api/admin/jobs/:id/retry`
- `GET /api/admin/tools`, `POST /api/admin/tools`, `PATCH /api/admin/tools/:id {status,max_file_mb,name,description}`
- `GET /api/admin/usage`, `GET /api/admin/storage`, `GET/PATCH /api/admin/settings`, `POST /api/admin/cleanup`
- `GET /api/admin/blog`, `POST /api/admin/blog`, `PATCH /api/admin/blog/:id`, `DELETE /api/admin/blog/:id`, `POST /api/admin/blog/categories`

## Misc

- `GET /health`, `GET /api/openapi.json`, `GET /api/docs` (Swagger UI)
- Rate limits differ by tier (anonymous/free/premium/admin). AI/process/upload/download/auth each have their own limiter.
