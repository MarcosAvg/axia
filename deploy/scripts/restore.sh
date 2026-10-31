#!/usr/bin/env bash
# Restaura un respaldo en una base destino.
# Uso con el Compose del repositorio (detecta el contenedor db):
#   ./deploy/scripts/restore.sh <archivo.dump>
# Uso con pg_restore del host:
#   DATABASE_URL='postgresql://...' ./deploy/scripts/restore.sh <archivo.dump>
# Uso con un contenedor concreto:
#   DB_CONTAINER=<contenedor-db> PGDATABASE=<db-destino> ./deploy/scripts/restore.sh <archivo.dump>
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/compose-operations.sh"
BACKUP_FILE="${1:?Uso: restore.sh <archivo.dump>}"
PGUSER="${PGUSER:-axia_owner}"
PGDATABASE="${PGDATABASE:-axia}"

if [[ -z "${DB_CONTAINER:-}" && -z "${DATABASE_URL:-}" ]] \
  && command -v docker >/dev/null 2>&1; then
  DB_CONTAINER="$(compose ps -q db)"
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "No existe el archivo: $BACKUP_FILE" >&2
  exit 1
fi

echo "Restaurando $BACKUP_FILE en ${PGDATABASE}…"
if [[ -n "${DB_CONTAINER:-}" ]]; then
  docker exec -i "$DB_CONTAINER" pg_restore -U "$PGUSER" -d "$PGDATABASE" \
    --single-transaction --exit-on-error --clean --if-exists --no-owner < "$BACKUP_FILE"
else
  : "${DATABASE_URL:?Define DATABASE_URL o DB_CONTAINER}"
  pg_restore -d "$DATABASE_URL" --single-transaction --exit-on-error --clean --if-exists --no-owner "$BACKUP_FILE"
fi

echo "Restauración terminada."
