#!/usr/bin/env bash
# Arranca la API en desarrollo usando .env y el puerto local del proyecto.
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
ENV_FILE="${AXIA_ENV_FILE:-$ROOT_DIR/.env}"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi
# En local no existe /data/evidence: es la ruta del contenedor. Compose la fija
# en /data/evidence y aquí se usa una ruta escribible del repositorio.
export STORAGE_DIR="${AXIA_DEV_STORAGE_DIR:-$ROOT_DIR/apps/server/data/evidence}"
export PORT="${PORT:-3100}"
exec pnpm --filter @axia/server dev
