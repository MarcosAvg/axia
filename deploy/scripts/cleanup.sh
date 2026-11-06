#!/usr/bin/env bash
# Limpieza programable: evidencias abandonadas y retención de datos operativos.
# Requiere la pila levantada (db y app) y ejecutarse desde el Compose del repositorio:
#   ./deploy/scripts/cleanup.sh
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/compose-operations.sh"
compose run --rm --no-deps app node dist/evidence/cleanup-cli.js
compose run --rm --no-deps app node dist/attachments/cleanup-cli.js
compose run --rm --no-deps app node dist/maintenance/cleanup-cli.js
