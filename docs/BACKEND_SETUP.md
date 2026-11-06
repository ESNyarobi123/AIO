# AIQ HireFlow — Backend Setup Guide

Package manager: **pnpm** (monorepo workspace).

## Architecture snapshot

```text
Client / Swagger
      │
      ▼
NestJS API  (/api/v1)
  ├── Auth (JWT + RBAC)
  ├── Users / Roles / Permissions
  ├── Customers
  ├── Equipment Categories / Models / Assets
  ├── Pricing
  ├── Settings
  └── Health
      │
      ▼
Prisma 7 + PostgreSQL
```

## Install from zero

```bash
# 0. Enable pnpm (once)
corepack enable
corepack prepare pnpm@12.11.2 --activate

# 1. Dependencies (from repo root)
pnpm install

# 2. Env
cp apps/api/.env.example apps/api/.env
# Edit DATABASE_URL if needed

# 3. Database
createdb aiq_hireflow   # if not exists
pnpm --filter @aiq-hireflow/api exec prisma migrate dev --name init
pnpm db:seed

# 4. Run
pnpm dev:api
```

Open:

- Swagger: http://localhost:3001/docs
- Health: http://localhost:3001/api/v1/health

## Auth flow

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"admin@aiqltd.co.tz","password":"Admin@HireFlow1"}'
```

Then send:

```http
Authorization: Bearer <accessToken>
```

## Seeded demo data

- Admin + Staff users
- Roles and permission matrix
- Company settings (AIQ Limited)
- Categories: Concrete, Survey, Power
- Model: Poker Vibrator + DAY/HOUR/WEEK prices
- Assets: `AIQ-PK-001` … `AIQ-PK-003`
- Demo customer (`0700000999`)

## Docker Postgres (optional)

From repo root:

```bash
docker compose up -d postgres
```

Then set:

```env
DATABASE_URL="postgresql://aiq:aiq_hireflow_dev@localhost:5432/aiq_hireflow?schema=public"
```
