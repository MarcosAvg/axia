#!/usr/bin/env bash
# Prepara una base limpia con la semilla demo y arranca la API para Playwright.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
: "${MIGRATION_DATABASE_URL:?Define MIGRATION_DATABASE_URL para E2E}"
: "${AXIA_APP_PASSWORD:?Define AXIA_APP_PASSWORD para E2E}"
: "${DATABASE_URL:?Define DATABASE_URL para E2E}"
export AXIA_DEMO_PASSWORD="${AXIA_DEMO_PASSWORD:-E2ePassword123!}"
# La ruta /data/evidence solo existe dentro del contenedor.
export STORAGE_DIR="${AXIA_E2E_STORAGE_DIR:-$ROOT_DIR/apps/server/data/evidence-e2e}"

cd "$ROOT_DIR"
pnpm --filter @axia/server db:reset
pnpm --filter @axia/server db:demo -- --demo
exec pnpm --filter @axia/server exec tsx src/server.ts
