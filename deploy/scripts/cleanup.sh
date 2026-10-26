#!/usr/bin/env bash
# Limpieza programable: evidencias abandonadas y retención de datos operativos.
# Requiere la pila levantada (db y app) y ejecutarse desde el Compose del repositorio:
#   ./deploy/scripts/cleanup.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

docker compose run --rm app node dist/evidence/cleanup-cli.js
docker compose run --rm app node dist/maintenance/cleanup-cli.js
