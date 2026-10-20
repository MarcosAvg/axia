# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim

RUN npm install --global pnpm@12.8.1

WORKDIR /app
RUN chown node:node /app

COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=node:node apps/server/package.json ./apps/server/package.json
COPY --chown=node:node apps/web/package.json ./apps/web/package.json
COPY --chown=node:node packages/shared/package.json ./packages/shared/package.json

USER node

RUN HUSKY=0 pnpm install --frozen-lockfile --filter @axia/server...

COPY --chown=node:node apps/server ./apps/server

WORKDIR /app/apps/server

CMD ["pnpm", "db:migrate"]
