#!/usr/bin/env bash
# Levanta db/migrate/app con el Compose del repositorio.
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"
[[ -f .env ]] || { echo 'Falta .env; ejecuta scripts/install.sh o créalo desde .env.example.' >&2; exit 1; }
docker compose up -d db
docker compose run --rm migrate
docker compose up -d app
docker compose ps
