# syntax=docker/dockerfile:1

FROM node:22.22.2-bookworm-slim AS base

RUN npm install --global pnpm@12.8.1

WORKDIR /app
RUN chown node:node /app

COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY --chown=node:node apps/server/package.json ./apps/server/package.json
COPY --chown=node:node apps/web/package.json ./apps/web/package.json
COPY --chown=node:node packages/shared/package.json ./packages/shared/package.json

USER node
RUN HUSKY=0 pnpm install --frozen-lockfile

FROM base AS build
COPY --chown=node:node apps/server ./apps/server
COPY --chown=node:node apps/web ./apps/web
COPY --chown=node:node packages/shared ./packages/shared
RUN pnpm --filter @axia/server build

FROM node:22.22.2-bookworm-slim AS runtime

RUN npm install --global pnpm@12.8.1

WORKDIR /app
RUN chown node:node /app

COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY --chown=node:node apps/server/package.json ./apps/server/package.json
COPY --chown=node:node apps/web/package.json ./apps/web/package.json
COPY --chown=node:node packages/shared/package.json ./packages/shared/package.json

USER node
RUN HUSKY=0 pnpm install --frozen-lockfile --prod --filter @axia/server... --ignore-scripts

COPY --from=build --chown=node:node /app/apps/server/dist ./apps/server/dist
COPY --from=build --chown=node:node /app/apps/server/db ./apps/server/db

FROM runtime AS migrate
WORKDIR /app/apps/server
CMD ["node", "dist/db/migrate.js"]

FROM runtime AS app
WORKDIR /app/apps/server
ENV NODE_ENV=production
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health/ready').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"]
CMD ["node", "dist/server.js"]
