# AIQ HireFlow

Equipment Rental, Inventory & Operations Management System for **AIQ Limited**.

| Layer | Stack |
|---|---|
| Frontend (next) | Next.js + HeroUI v3 |
| Backend (now) | NestJS 12 + Prisma 7 + PostgreSQL |
| Package manager | **pnpm** (workspace) |
| Docs | Swagger UI at `/docs` |
| Spec | [`AIQ_HireFlow_Advanced_SRS.md`](./AIQ_HireFlow_Advanced_SRS.md) |

---

## Quick start — Backend API

### Prerequisites

- Node.js 22+
- **pnpm** 9+ (`corepack enable && corepack prepare pnpm@12.11.2 --activate`)
- PostgreSQL 14+ (local or Docker)

### 1. Install workspace dependencies

From the repo root:

```bash
pnpm install
```

### 2. Configure environment

```bash
cp apps/api/.env.example apps/api/.env
```

Default local URL (Homebrew Postgres as current macOS user):

```env
DATABASE_URL="postgresql://eunice@localhost:5432/aiq_hireflow?schema=public"
```

Or start Docker Postgres:

```bash
docker compose up -d postgres
# DATABASE_URL=postgresql://aiq:aiq_hireflow_dev@localhost:5432/aiq_hireflow?schema=public
```

Create the database if needed:

```bash
createdb aiq_hireflow
```

### 3. Migrate + seed

```bash
pnpm --filter @aiq-hireflow/api exec prisma migrate dev --name init
pnpm db:seed
```

### 4. Run the API

```bash
pnpm dev:api
```

| Resource | URL |
|---|---|
| API base | http://localhost:3001/api/v1 |
| Health | http://localhost:3001/api/v1/health |
| **Swagger** | http://localhost:3001/docs |

### Demo credentials (seed)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@aiqltd.co.tz` | `Admin@HireFlow1` |
| Staff | `staff@aiqltd.co.tz` | `Staff@HireFlow1` |

Use Swagger **Authorize** with: `Bearer <accessToken>` after calling `POST /api/v1/auth/login`.

---

## Useful scripts (repo root)

```bash
pnpm install                 # install all workspace packages
pnpm dev:api                 # NestJS watch mode
pnpm build:api               # prisma generate + nest build
pnpm db:seed                 # seed roles, users, sample equipment
pnpm db:migrate              # prisma migrate dev
pnpm db:studio               # Prisma Studio
```

Or from `apps/api`:

```bash
pnpm start:dev
pnpm build
pnpm db:seed
pnpm prisma:studio
```

---

## Implemented in this phase

- NestJS modular monolith under `/api/v1`
- Prisma schema for full HireFlow domain (identity, inventory, rentals, finance, audit)
- JWT auth + RBAC permissions
- Swagger OpenAPI UI
- CRUD APIs: users, roles, customers, categories, models, assets, pricing, settings
- Inventory summary + asset history
- Helmet, validation, throttling, CORS, structured error envelope

## Next phases

1. Rentals / dispatch / returns workflows
2. Invoices, payments, deposits + PDF
3. Next.js + HeroUI Admin/Staff dashboards
