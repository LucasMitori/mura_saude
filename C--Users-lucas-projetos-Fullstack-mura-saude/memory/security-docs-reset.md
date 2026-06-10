---
name: security-docs-reset
description: Final security hardening, Swagger docs (prod-gated), and DB reset script
metadata:
  type: project
---

2026-06 final hardening pass:
- Scrubbed real creds from `README.md` and `scripts/e2e-test.mjs` (now read TEST_ADMIN_EMAIL/PASSWORD env). **`Panda1801` is in git history → must be rotated** (Atlas + Vercel + the admin account). See [[committed-credentials-warning]].
- Removed `cors: true` from `/api/**` route rules → same-origin only (no `Access-Control-Allow-Origin: *`). API is Bearer-token (no cookies/CSRF).
- Audit confirmed: no password fields returned to clients (login finds full doc but responds with safe fields only; me/admin use `projection: { password: 0 }`).

Swagger/OpenAPI docs:
- `server/utils/openapi.ts` (hand-written OpenAPI 3 spec, all endpoints + which permission each needs).
- `/docs` (Swagger UI HTML via jsDelivr CDN) + `/api/docs/openapi` (spec JSON). Both gated by `server/utils/docs-access.ts` `assertDocsAccess()`: open in dev; in production require `?token=<API_DOCS_TOKEN>` (env `apiDocsToken`) and return 404 if token unset/wrong. Added `API_DOCS_TOKEN` to runtimeConfig + `.env.example`.

DB reset: `scripts/reset-db.mjs` (`pnpm reset:db`) — DESTRUCTIVE, requires `--yes`. Deletes all dailyRecords, all workoutRoutines, and every user EXCEPT `ADMIN_EMAIL`; then re-asserts that admin (role + password from .env). I cannot run it (sandbox has no DB network); the USER runs it with prod env to clean the Vercel/Atlas DB. Keeps the devmitori admin.

2026-06 "120% security" pass:
- `nuxt.config` `sourcemap: { client: false }` → NO client .map files in `.output/public` (verified after clean build) → DevTools shows only minified bundles, not original .vue/.ts. (Client JS itself can't be hidden — it runs in the browser.)
- CSP in `server/middleware/security-headers.ts`, PRODUCTION ONLY (`!import.meta.dev`, so it never breaks Vite HMR), with `DISABLE_CSP=true` env escape hatch. Permissive (needs 'unsafe-inline' for Nuxt inline payload + Vuetify styles; omits 'unsafe-eval') but adds object-src none, frame-ancestors none, base-uri self, connect-src self, upgrade-insecure-requests; jsdelivr allowed for /docs swagger. Plus COOP same-origin, X-Permitted-Cross-Domain-Policies none, HSTS preload, Referrer-Policy no-referrer.
- Layout: single content width = `.main-container` max-width 1400 (default.vue); removed all per-page max-widths so screen edges align. Reports KPI cards `h-100`. Removed Perfil sidebar link (user-card already links to /profile).

Known residual risks (noted, not fixed — need deps/bigger work): in-memory rate-limit is per-instance/weak on Vercel serverless (use Upstash for real limits); JWT in localStorage (XSS exposure). RBAC enforcement itself is solid (see [[rbac-roles-permissions]]).
