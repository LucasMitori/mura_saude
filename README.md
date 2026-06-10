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

Runs 23 checks covering auth, daily CRUD, per-meal CRUD, search, water, measurements, role enforcement, NoSQL injection sanitization, ObjectId guard.

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
- `/meals/quick` — **fast single-meal add per period** ⭐
- `/daily/new` — full-day entry (admin)
- `/daily/:date` — daily detail w/ per-meal edit & delete

## Security hardening applied

- JWT secret required (no insecure fallback) with `issuer` claim
- ObjectId inputs validated to prevent 500s on malformed IDs
- Rate limiting on `/auth/login`, `/auth/register`, `/auth/seed-admin`
- MongoDB query input sanitized (rejects `$`/`.` keys) to prevent NoSQL injection
- Strict response headers (X-Frame-Options, CSP-ish, HSTS, Referrer-Policy, etc.)
- Stack traces suppressed in production responses
- Login error is time-equalized to avoid email enumeration
- Registration never auto-promotes to admin (admin is seeded only)
- Removed dangerous unauthenticated `/api` root endpoints

## Scripts

- `pnpm dev` — start dev server
- `pnpm build` — production build
- `pnpm preview` — preview production build
- `pnpm seed:admin` — upsert admin from .env
- `pnpm seed:mock` — seed admin + 3 days mock data
