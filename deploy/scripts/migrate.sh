#!/usr/bin/env bash
# Aplica migraciones con el servicio migrate del Compose.
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"
docker compose run --rm migrate
