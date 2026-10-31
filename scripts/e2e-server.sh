#!/usr/bin/env bash
# El preparador valida el destino antes de conectar y nunca carga .env.
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export AXIA_ENV_FILE=/dev/null
export STORAGE_DIR="$ROOT_DIR/apps/server/data/evidence-e2e"
cd "$ROOT_DIR"
exec pnpm --filter @axia/server test:e2e:server
