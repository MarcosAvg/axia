#!/usr/bin/env bash
# Respalda el volumen de evidencias (fotos y miniaturas). No respalda la base; usa backup.sh.
# Uso:
#   ./deploy/scripts/backup-evidence.sh
#   BACKUP_DIR=/var/backups/axia ./deploy/scripts/backup-evidence.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
VOLUME="${EVIDENCE_VOLUME:-axia_axia_evidence}"
IMAGE="${AXIA_APP_IMAGE:-axia-app:local}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$BACKUP_DIR/axia-evidence-$STAMP.tgz"

mkdir -p "$BACKUP_DIR"
if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  echo "No existe la imagen $IMAGE; constrúyela con: docker compose build app" >&2
  exit 1
fi

docker run --rm \
  -v "$VOLUME:/data:ro" \
  -v "$(cd "$BACKUP_DIR" && pwd):/backup" \
  "$IMAGE" tar -C /data -czf "/backup/$(basename "$FILE")" .

echo "Respaldo de evidencias creado: $FILE"
find "$BACKUP_DIR" -maxdepth 1 -name 'axia-evidence-*.tgz' -type f \
  -mtime "+${RETENTION_DAYS}" -print -delete
