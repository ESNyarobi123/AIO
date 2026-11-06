# AIQ HireFlow

Equipment Rental, Inventory & Operations Management System for **AIQ Limited**.

**Live:** https://aio.yunigo.online · **API docs:** https://aio.yunigo.online/docs

| Layer | Stack |
|---|---|
| Frontend (`apps/web`) | Next.js 16 (static export) + HeroUI v3 + Tailwind v4 + React Query |
| Backend (`apps/api`) | NestJS 12 + Prisma 7 + PostgreSQL + JWT RBAC |
| Package manager | **pnpm** (workspace) |
| Proxy / TLS | **Caddy** (automatic Let's Encrypt) |
| Runtime | **Docker Compose** |
| Spec | [`AIQ_HireFlow_Advanced_SRS.md`](./AIQ_HireFlow_Advanced_SRS.md) |

---

## Quick start — local development

### Prerequisites

- Node.js 22+
- **pnpm** (`corepack enable && corepack prepare pnpm@12.11.2 --activate`)
- PostgreSQL 14+ (local or Docker)

### 1. Install workspace dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp apps/api/.env.example apps/api/.env
```

Or start Docker Postgres:

```bash
docker compose up -d postgres
# DATABASE_URL=postgresql://aiq:aiq_hireflow_dev@localhost:5432/aiq_hireflow?schema=public
```

### 3. Migrate + seed

```bash
pnpm --filter @aiq-hireflow/api exec prisma migrate dev --name init
pnpm db:seed      # roles, users + sample fleet
pnpm db:sample    # re-apply just the demo catalogue (safe to re-run)
```

`db:sample` installs a demo fleet: 5 categories, 12 models, 32 individual assets
with photos, hourly/daily/weekly/monthly pricing, accessories, 8 customers,
3 hire cards (active, closed, overdue), invoices, receipts, a security deposit
and one open maintenance job. Photos are bundled in
`apps/api/prisma/sample-images/` and copied into `uploads/` — credit list in
[`CREDITS.md`](./apps/api/prisma/sample-images/CREDITS.md).

### 4. Run the app

```bash
pnpm dev:api    # http://localhost:3001/api/v1  (Swagger: /docs)
pnpm dev:web    # http://localhost:3000
```

### Demo credentials (seed)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@aiqltd.co.tz` | `Admin@HireFlow1` |
| Staff | `staff@aiqltd.co.tz` | `Staff@HireFlow1` |

> Change these immediately in production via the Staff screen.

---

## Production deployment

Everything for the server lives in [`deploy/`](./deploy):

| File | Purpose |
|---|---|
| `deploy/docker-compose.prod.yml` | Postgres + API + Web (nginx) + Caddy |
| `deploy/api.Dockerfile` | NestJS build (Prisma generate, dist running as `node dist/main.js`) |
| `deploy/web.Dockerfile` | Next.js static export served by nginx |
| `deploy/nginx.conf` | SPA-style serving for the exported console |
| `deploy/Caddyfile` | HTTPS for `aio.yunigo.online`, `/api/*`, `/docs*`, `/uploads/*` → API |
| `deploy/deploy.sh` | Clone/pull from GitHub, generate secrets, migrate, seed, start |

### First-time / repeat deploy on the server

```bash
ssh root@178.128.36.246
bash /opt/aio/deploy/deploy.sh
```

`deploy.sh` clones `https://github.com/ESNyarobi123/AIO.git` into `/opt/aio`, creates `deploy/.env` with random Postgres/JWT secrets (only if missing), applies Prisma migrations, seeds roles + admin/staff users, then starts all containers.

### Update to the latest `main`

```bash
cd /opt/aio && git pull && cd deploy \
  && docker compose --env-file .env -f docker-compose.prod.yml pull \
  && docker compose --env-file .env -f docker-compose.prod.yml up -d
```

### Re-apply the demo fleet on an existing database

```bash
cd /opt/aio/deploy && docker compose --env-file .env -f docker-compose.prod.yml \
  run --rm --no-deps --entrypoint sh api -lc \
  "cd /app/apps/api && ./node_modules/.bin/tsx prisma/sample.ts"
```

### Images

`.github/workflows/images.yml` builds both images on every push to `main` and publishes them to GHCR:

- `ghcr.io/esnyarobi123/aio-api:latest`
- `ghcr.io/esnyarobi123/aio-web:latest`

The server only **pulls** them — it never builds (the droplet has 512 MB RAM).

### Routing

| Path | Target |
|---|---|
| `/` and app routes | `web:80` (nginx static export) |
| `/api/v1/*`, `/docs*` | `api:3001` (NestJS) |
| `/uploads/*` | `api:3001` (equipment photos) |

---

## Useful scripts (repo root)

```bash
pnpm install                 # install all workspace packages
pnpm dev:api                 # NestJS watch mode
pnpm dev:web                 # Next.js dev server
pnpm build:api               # prisma generate + nest build
pnpm db:seed                 # seed roles, users, sample equipment
pnpm db:migrate              # prisma migrate dev
pnpm db:studio               # Prisma Studio
```

---

## Implemented

- NestJS modular monolith under `/api/v1` with Swagger OpenAPI UI
- Prisma schema covering identity, inventory, rentals, finance, and audit domains
- JWT auth + RBAC permissions (Admin / Staff), staff account management
- Customers, equipment categories, models, individual assets with photo uploads (URL or file)
- Rentals, rental requests, quotations, dispatch, returns, inspections, maintenance
- Invoices, payments, deposits, expenses, PDF generation
- Dashboard, reports, audit logs, company settings
- HeroUI console with drawers, search, filters, and role-aware navigation
- Vitest end-to-end suite asserting access and permission boundaries
- Docker Compose + Caddy production stack with automatic TLS
