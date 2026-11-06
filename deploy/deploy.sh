#!/usr/bin/env bash
# AIQ HireFlow — one-shot production deploy on a fresh Ubuntu VPS.
# Usage: bash deploy/deploy.sh
set -euo pipefail

REPO="${REPO:-https://github.com/ESNyarobi123/AIO.git}"
APP_DIR="${APP_DIR:-/opt/aio}"
BRANCH="${BRANCH:-main}"

if [ ! -d "$APP_DIR/.git" ]; then
  mkdir -p "$(dirname "$APP_DIR")"
  git clone --branch "$BRANCH" "$REPO" "$APP_DIR"
else
  git -C "$APP_DIR" fetch origin "$BRANCH"
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" reset --hard "origin/$BRANCH"
fi

cd "$APP_DIR/deploy"

if [ ! -f .env ]; then
  cp .env.example .env
  PG_PASS="$(openssl rand -hex 20)"
  ACCESS="$(openssl rand -hex 32)"
  REFRESH="$(openssl rand -hex 32)"
  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${PG_PASS}|" .env
  sed -i "s|^JWT_ACCESS_SECRET=.*|JWT_ACCESS_SECRET=${ACCESS}|" .env
  sed -i "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=${REFRESH}|" .env
  echo "Generated deploy/.env with fresh secrets."
fi

docker compose --env-file .env -f docker-compose.prod.yml pull api web
docker compose --env-file .env -f docker-compose.prod.yml up -d postgres

echo "Waiting for Postgres…"
for _ in $(seq 1 40); do
  if docker compose --env-file .env -f docker-compose.prod.yml exec -T postgres pg_isready -U "$(grep '^POSTGRES_USER=' .env | cut -d= -f2)" >/dev/null 2>&1; then
    break
  fi
  sleep 3
done

echo "Applying migrations…"
docker compose --env-file .env -f docker-compose.prod.yml run --rm --no-deps --entrypoint sh api -lc \
  "cd /app/apps/api && ./node_modules/.bin/prisma migrate deploy"

PG_USER="$(grep '^POSTGRES_USER=' .env | cut -d= -f2)"
PG_DB="$(grep '^POSTGRES_DB=' .env | cut -d= -f2)"
USER_COUNT="$(docker compose --env-file .env -f docker-compose.prod.yml exec -T postgres \
  psql -U "$PG_USER" -d "$PG_DB" -tAc 'SELECT count(*) FROM "users";' 2>/dev/null | tr -d '[:space:]')"

if [ "${USER_COUNT:-0}" = "0" ]; then
  echo "Empty database — seeding roles, demo users, and sample equipment…"
  docker compose --env-file .env -f docker-compose.prod.yml run --rm --no-deps --entrypoint sh api -lc \
    "cd /app/apps/api && ./node_modules/.bin/tsx prisma/seed.ts"
else
  echo "Database already seeded (${USER_COUNT} users) — skipping seed."
fi

docker compose --env-file .env -f docker-compose.prod.yml up -d
docker compose --env-file .env -f docker-compose.prod.yml ps
