#!/usr/bin/env bash
# Respalda la base de Axia en formato custom (`pg_dump -Fc`) y borra los dumps antiguos.
# Uso (host con pg_dump):
#   DATABASE_URL='postgresql://...' ./deploy/scripts/backup.sh
# Uso (dump dentro del contenedor de base, p. ej. el compose oficial):
#   DB_CONTAINER=<contenedor-db> ./deploy/scripts/backup.sh
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
PGUSER="${PGUSER:-postgres}"
PGDATABASE="${PGDATABASE:-postgres}"

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
