# Mura Saúde

Health tracking dashboard (meals per period, bioimpedance, water, workouts) — Nuxt 4 + Vue 3 + Vuetify + MongoDB.

## Prerequisites

- Node.js 20.x (the project also runs on 22.x with a warning)
- pnpm 10.x
- A reachable MongoDB Atlas (or self-hosted) cluster

## Environment

Copy `.env.example` to `.env` and fill in:

```bash
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/?appName=APP
JWT_SECRET=                # generate with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=            # set a strong password; never commit it
NODE_ENV=development
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=20
API_DOCS_TOKEN=           # required to view /docs in production (leave empty to disable docs in prod)
```

> **Security:** never commit real secrets. Keep `.env` in `.gitignore` (it is). If any credential was ever committed (admin password, MongoDB password, JWT secret), **rotate it** in MongoDB Atlas / Vercel env vars. The API docs at `/docs` are open in development but require `?token=$API_DOCS_TOKEN` in production (and are disabled entirely if `API_DOCS_TOKEN` is unset).

## Install

```bash
pnpm install
```

## Run dev server

```bash
pnpm dev
```

Open http://localhost:3000

> **Local TLS workaround:** if Node throws `UNABLE_TO_VERIFY_LEAF_SIGNATURE` when connecting to Atlas (corporate proxy / antivirus intercepting TLS on your machine), prepend `NODE_TLS_REJECT_UNAUTHORIZED=0` for *local dev only*:
>
> ```bash
> NODE_TLS_REJECT_UNAUTHORIZED=0 pnpm dev
> NODE_TLS_REJECT_UNAUTHORIZED=0 pnpm seed:admin
> NODE_TLS_REJECT_UNAUTHORIZED=0 pnpm seed:mock
> ```
>
> Or use the shortcut that sets the variable for the dev process only:
>
> ```bash
> pnpm dev:local
> ```
>
> Never set this in production. The proper fix is `NODE_EXTRA_CA_CERTS=<path-to-your-org-ca-bundle.crt>`.

## Seed admin & mock data

```bash
# Create or update the admin user from .env (also removes any stale admins)
pnpm seed:admin

# Same, plus 3 days of mock data (all meal periods, workout, bioimpedance, water)
pnpm seed:mock
```

## End-to-end smoke test

With the dev server running, in another terminal:

```bash
node scripts/e2e-test.mjs http://localhost:3000
```

Runs 43 checks covering auth, daily CRUD, per-meal CRUD, search, water, measurements, role enforcement, NoSQL injection sanitization, ObjectId guard, and the meal-photo system (upload, size/type/magic-byte validation, gallery, permission gates, delete cascades).

There is also a direct database health check (connectivity, indexes, admin user, data integrity):

```bash
pnpm test:db
```

You can also seed admin via the API (rate-limited, requires the JWT secret):

```bash
curl -X POST http://localhost:3000/api/auth/seed-admin \
  -H "Content-Type: application/json" \
  -d '{"secret":"<JWT_SECRET from .env>"}'
```

## API surface

### Auth
- `POST /api/auth/register` — register a `viewer` user (rate-limited)
- `POST /api/auth/login` — get a JWT (rate-limited, time-equalized)
- `GET  /api/auth/me` — current user
- `POST /api/auth/seed-admin` — upsert admin user from env (requires JWT secret)

### Daily records (admin write, viewers read admin data)
- `GET  /api/daily?date=YYYY-MM-DD` — fetch one day
- `GET  /api/daily?from=&to=&limit=` — fetch range
- `POST /api/daily` — bulk save (used by "Nova Entrada Completa")
- `PUT  /api/daily/:id` — update notes/caloricGoal
- `DELETE /api/daily/:id` — delete a day

### Per-period meals
- `GET  /api/meals?from=&to=&type=&search=` — search/filter meals across days
- `POST /api/meals` — add a single meal to a date (creates the day if missing) ⭐
- `PUT  /api/meals/:mealId` — edit a meal
- `DELETE /api/meals/:mealId` — delete a meal

### Meal photos (5 MB max, auto-delete after 30 days)
- `POST /api/meals/:mealId/image` — attach/replace a photo (body: `{ date, dataUrl }`; JPEG/PNG/WebP, magic-byte validated, ≤ 5 MB)
- `DELETE /api/meals/:mealId/image` — remove a meal's photo (clears the ref, no expiry message)
- `GET  /api/meal-images/:id` — fetch the binary (authenticated; 404 after expiry)
- `DELETE /api/meal-images/:id` — **admin**: delete from the gallery to free DB space
- `GET  /api/admin/gallery` — **admin**: all photo metadata grouped into day folders + storage totals

Photos live in the `mealImages` collection with a **MongoDB TTL index** (`createdAt`, 30 days) — the database deletes them automatically, even when the app isn't running. The meal keeps its `{ id, uploadedAt }` ref after expiry, so the meal card shows *"A foto desta refeição foi removida automaticamente após 30 dias."* instead of silently losing the photo. Deleting a meal or a whole day cascades to its photos.

> **Upload size note:** photos travel as base64 JSON (+33%), and Vercel caps request bodies at ~4.5 MB. To make uploads work everywhere, the client **compresses images automatically** before uploading (downscale to ≤2560px, WebP, target ≤2.5 MB) — even a 30 MB camera photo uploads fine. The 5 MB server cap remains as the hard backstop.

### Per-period bioimpedance
- `GET  /api/measurements?from=&to=&limit=`
- `POST /api/measurements` — add a measurement (morning/evening)
- `PUT  /api/measurements/:id`
- `DELETE /api/measurements/:id`

### Water (incremental)
- `PUT  /api/water` — body: `{ date, intake? | addMl?, goal? }`

### Workouts
- `PUT  /api/workouts` — replace full workout (`null` to clear)

### Health
- `GET  /api/health` — public

## Pages

- `/login` — sign in / register (flip card)
- `/` — dashboard with charts, table, widgets
- `/reports` — filters, date ranges, search, top foods, CSV/JSON export
- `/meals/quick` — **fast single-meal add per period** ⭐ (with photo upload)
- `/daily/new` — full-day entry (admin)
- `/daily/:date` — daily detail w/ per-meal edit & delete (+ photo thumbnails)
- `/admin/users` — user role management (admin)
- `/admin/gallery` — **meal-photo gallery in day folders** with storage usage and per-photo / per-day delete (admin)
- `/admin/settings` — app customization (admin): login-page background image (**permanent** — exempt from the 30-day photo TTL)

## Security hardening applied

**Authentication & authorization**
- JWT secret required (no insecure fallback), signed with `issuer` claim; forged/expired tokens → 401
- Roles/permissions are resolved from the **database on every request** — the token only proves identity, so a tampered token or stale role can never escalate privileges
- Login error is time-equalized (dummy bcrypt compare) to avoid email enumeration
- Registration never auto-promotes to admin (admin is seeded only); strong-password rules enforced server-side
- Rate limiting on `/auth/login` (8/min — brute force → 429), `/auth/register`, `/auth/seed-admin`

**Injection & input**
- MongoDB query input sanitized (rejects `$`/`.` keys) → NoSQL injection neutralized; login body is type-checked (objects rejected)
- ObjectId inputs validated (malformed IDs → 400, never a 500 stack leak)
- Bulk day-save maps every field explicitly — client input is never spread into documents, and photo refs cannot be forged through it
- Image uploads: 5 MB cap enforced before decoding, MIME allow-list, **magic-byte sniffing** (a renamed .exe can't pass as .png)

**Headers & transport (see `server/middleware/security-headers.ts` + `nuxt.config.ts`)**
- Content-Security-Policy in production (no `unsafe-eval`; `connect-src 'self'` blocks data exfiltration to other origins; `frame-ancestors 'none'`)
- HSTS (`max-age` 1y, preload), `upgrade-insecure-requests` — defeats protocol-downgrade interception
- X-Frame-Options DENY, nosniff, `Referrer-Policy: no-referrer`, COOP/CORP same-origin, Permissions-Policy locked down
- `X-Robots-Tag: noindex` + `robots.txt Disallow: /` — personal health data stays out of search engines
- No CORS wildcard: the API only answers same-origin requests, so other websites cannot call it from a victim's browser

**Information exposure**
- Client source maps disabled in production builds — DevTools shows only the minified bundle, never the original `.vue`/`.ts` source (server maps stay local for debugging and are never served)
- Stack traces stripped from production error responses; 5xx bodies are generic
- `/docs` (Swagger) requires `?token=$API_DOCS_TOKEN` in production, disabled if unset
- API responses are `Cache-Control: no-store` — no health data lingers in shared caches

**Known trade-off**: the JWT lives in `localStorage` (simple SPA pattern). An XSS bug could read it — mitigated by the strict CSP, Vue's output escaping, and 7-day token expiry. Migrating to httpOnly cookies + CSRF tokens is the next step if the app ever becomes multi-tenant.

Verified continuously by `pnpm e2e` (43 checks) and `pnpm test:perf` (29 checks incl. authz boundaries, injection, upload abuse, rate limiting, parallel-write races).

## Scripts

- `pnpm dev` — start dev server
- `pnpm build` — production build
- `pnpm preview` — preview production build
- `pnpm seed:admin` — upsert admin from .env
- `pnpm seed:mock` — seed admin + 3 days mock data
- `pnpm test:db` — direct MongoDB health/integrity check
- `pnpm test:perf` — performance + security + meal-correctness suite (needs dev server)
- `pnpm e2e` — API smoke test against a running dev server
- `pnpm dev:local` — dev server with the local TLS workaround (this machine only)
