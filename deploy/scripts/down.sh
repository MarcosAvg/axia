#!/usr/bin/env bash
# Detiene el stack nuevo sin borrar volúmenes.
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"
docker compose down
