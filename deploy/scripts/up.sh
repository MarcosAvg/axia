#!/usr/bin/env bash
# Descarga las imágenes, levanta db, aplica migraciones y arranca app.
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"
[[ -f .env ]] || { echo 'Falta .env; créalo desde .env.example.' >&2; exit 1; }
docker compose pull
docker compose up -d db
docker compose run --rm migrate
docker compose up -d app
docker compose ps
