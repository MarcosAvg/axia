#!/usr/bin/env bash
# Respalda la base de Axia en formato custom (`pg_dump -Fc`) y borra los dumps antiguos.
# Uso con el Compose del repositorio (detecta el contenedor db):
#   ./deploy/scripts/backup.sh
# Uso con pg_dump del host:
#   DATABASE_URL='postgresql://...' ./deploy/scripts/backup.sh
# Uso con un contenedor concreto:
#   DB_CONTAINER=<contenedor-db> ./deploy/scripts/backup.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
PGUSER="${PGUSER:-axia_owner}"
PGDATABASE="${PGDATABASE:-axia}"

if [[ -z "${DB_CONTAINER:-}" && -z "${DATABASE_URL:-}" ]] \
  && command -v docker >/dev/null 2>&1; then
  DB_CONTAINER="$(cd "$ROOT_DIR" && docker compose ps -q db 2>/dev/null || true)"
fi

mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$BACKUP_DIR/axia-$STAMP.dump"

if [[ -n "${DB_CONTAINER:-}" ]]; then
  docker exec "$DB_CONTAINER" pg_dump -U "$PGUSER" -d "$PGDATABASE" -Fc > "$FILE"
else
  : "${DATABASE_URL:?Define DATABASE_URL o DB_CONTAINER}"
  pg_dump "$DATABASE_URL" -Fc -f "$FILE"
fi

echo "Respaldo creado: $FILE"
echo "Borrando dumps con más de ${RETENTION_DAYS} días…"
find "$BACKUP_DIR" -maxdepth 1 -name 'axia-*.dump' -type f -mtime "+${RETENTION_DAYS}" -print -delete
