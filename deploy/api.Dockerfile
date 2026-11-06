# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile --filter @aiq-hireflow/api...

FROM deps AS build
COPY apps/api/prisma apps/api/prisma
COPY apps/api/prisma.config.ts apps/api/prisma.config.ts
COPY apps/api/tsconfig*.json apps/api/
COPY apps/api/nest-cli.json apps/api/
COPY apps/api/src apps/api/src
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN cd apps/api && pnpm exec prisma generate && pnpm exec nest build

FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3001
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/src/generated ./apps/api/src/generated
COPY --from=build /app/apps/api/prisma.config.ts ./apps/api/prisma.config.ts
COPY apps/api/package.json ./apps/api/package.json
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/main.js"]
