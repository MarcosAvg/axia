#!/usr/bin/env bash
# Respaldo individual; para consistencia con la base usa backup-all.sh.
set -euo pipefail
umask 077
source "$(dirname "${BASH_SOURCE[0]}")/compose-operations.sh"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
mkdir -p "$BACKUP_DIR"
FILE="$BACKUP_DIR/axia-evidence-$(date -u +%Y%m%dT%H%M%SZ)-$$.tgz"
PARTIAL="$(mktemp "$BACKUP_DIR/.evidence-XXXXXXXX")"
trap 'rm -f -- "$PARTIAL"' EXIT
if [[ -n "${EVIDENCE_VOLUME:-}" ]]; then
  IMAGE="${AXIA_IMAGE:-${AXIA_APP_IMAGE:?Define AXIA_IMAGE para usar EVIDENCE_VOLUME}}"
  docker run --rm -v "$EVIDENCE_VOLUME:/data/evidence:ro" "$IMAGE" tar -C /data/evidence -czf - . > "$PARTIAL"
else
  compose run --rm --no-deps -T app tar -C /data/evidence -czf - . > "$PARTIAL"
fi
[[ -s "$PARTIAL" ]] || fail 'El respaldo de evidencias está vacío.'
mv "$PARTIAL" "$FILE"
echo "Respaldo de evidencias creado: $FILE"
find "$BACKUP_DIR" -maxdepth 1 -name 'axia-evidence-*.tgz' -type f -mtime "+${RETENTION_DAYS}" -print -delete
