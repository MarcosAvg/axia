#!/usr/bin/env bash
# Conjunto consistente: app detenida mientras se copian base y evidencias.
set -euo pipefail
umask 077
source "$(dirname "${BASH_SOURCE[0]}")/compose-operations.sh"
require_image
BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"
BACKUP_DIR="$(cd "$BACKUP_DIR" && pwd)"
STAGING="$(mktemp -d "$BACKUP_DIR/.incomplete-XXXXXXXX")"
APP_WAS_RUNNING=''
finish() {
  local status=$?
  trap - EXIT
  [[ ! -d "$STAGING" ]] || rm -r -- "$STAGING"
  if [[ -n "$APP_WAS_RUNNING" ]]; then compose start app || status=1; fi
  exit "$status"
}
trap finish EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
stop_app
# No hay procesos de la aplicación ni tareas one-off escribiendo durante ambas copias.
database pg_dump -Fc > "$STAGING/database.dump"
compose run --rm --no-deps -T app tar -C /data/evidence -czf - . > "$STAGING/evidence.tgz"
[[ -s "$STAGING/database.dump" && -s "$STAGING/evidence.tgz" ]] || fail 'El respaldo produjo un archivo vacío.'
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
{
  printf 'format=1\ncreated_at=%s\nimage=%s\nimage_id=%s\n' "$STAMP" "$AXIA_IMAGE" "$IMAGE_ID"
  printf 'database_sha256=%s\n' "$(sha256sum "$STAGING/database.dump" | cut -d' ' -f1)"
  printf 'evidence_sha256=%s\n' "$(sha256sum "$STAGING/evidence.tgz" | cut -d' ' -f1)"
} > "$STAGING/manifest"
DESTINATION="$BACKUP_DIR/axia-$STAMP-${STAGING##*-}"
mv "$STAGING" "$DESTINATION"
echo "Conjunto de respaldo creado: $DESTINATION"
