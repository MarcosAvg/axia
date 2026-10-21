#!/usr/bin/env bash
# Restaura un respaldo de evidencias. Detén `app` antes de ejecutar y vuelve a levantarlo después.
# Uso:
#   ./deploy/scripts/restore-evidence.sh backups/axia-evidence-<fecha>.tgz
set -euo pipefail

BACKUP_FILE="${1:?Uso: restore-evidence.sh <archivo.tgz>}"
VOLUME="${EVIDENCE_VOLUME:-axia_axia_evidence}"
IMAGE="${AXIA_APP_IMAGE:-axia-app:local}"

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "No existe el archivo: $BACKUP_FILE" >&2
  exit 1
fi
if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  echo "No existe la imagen $IMAGE; constrúyela con: docker compose build app" >&2
  exit 1
fi

docker run --rm --user 0 \
  -v "$VOLUME:/data" \
  -v "$(cd "$(dirname "$BACKUP_FILE")" && pwd):/backup:ro" \
  "$IMAGE" tar -C /data -xzf "/backup/$(basename "$BACKUP_FILE")"

echo "Evidencias restauradas en el volumen $VOLUME."
