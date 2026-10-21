#!/usr/bin/env bash
# Arranca la API en desarrollo usando .env y el puerto local del proyecto.
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi
export PORT="${PORT:-3100}"
exec pnpm --filter @axia/server dev
