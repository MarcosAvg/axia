#!/usr/bin/env bash
# Apaga el stack de Supabase autoalojado. NO borra volúmenes (los datos se conservan).
# Uso:
#   ./deploy/scripts/down.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_DIR="${COMPOSE_DIR:-$ROOT_DIR/deploy/supabase/docker}"

if [[ ! -f "$COMPOSE_DIR/docker-compose.yml" ]]; then
  echo "No hay compose en $COMPOSE_DIR (¿lo levantaste con up.sh?)." >&2
  exit 1
fi

(cd "$COMPOSE_DIR" && docker compose down)
echo "Stack detenido (los volúmenes se conservan)."
