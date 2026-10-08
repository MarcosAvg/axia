#!/usr/bin/env bash
# Restaura un respaldo en una base destino.
# Uso (host con pg_restore):
#   DATABASE_URL='postgresql://...' ./deploy/scripts/restore.sh <archivo.dump>
# Uso (restauración dentro del contenedor de base, base desechable en pruebas):
#   DB_CONTAINER=<contenedor-db> PGDATABASE=<db-destino> ./deploy/scripts/restore.sh <archivo.dump>
set -euo pipefail

BACKUP_FILE="${1:?Uso: restore.sh <archivo.dump>}"
PGUSER="${PGUSER:-postgres}"
PGDATABASE="${PGDATABASE:-postgres}"

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "No existe el archivo: $BACKUP_FILE" >&2
  exit 1
fi

echo "Restaurando $BACKUP_FILE en ${PGDATABASE}…"
if [[ -n "${DB_CONTAINER:-}" ]]; then
  docker exec -i "$DB_CONTAINER" pg_restore -U "$PGUSER" -d "$PGDATABASE" \
    --clean --if-exists --no-owner < "$BACKUP_FILE"
else
  : "${DATABASE_URL:?Define DATABASE_URL o DB_CONTAINER}"
  pg_restore -d "$DATABASE_URL" --clean --if-exists --no-owner "$BACKUP_FILE"
fi

echo "Restauración terminada."
