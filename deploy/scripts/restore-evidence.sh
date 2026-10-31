#!/usr/bin/env bash
# Restauración individual; app debe estar detenida y el volumen vacío.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/compose-operations.sh"
BACKUP_FILE="${1:?Uso: restore-evidence.sh <archivo.tgz>}"
[[ -f "$BACKUP_FILE" ]] || fail "No existe el archivo: $BACKUP_FILE"
if [[ -n "${EVIDENCE_VOLUME:-}" ]]; then
  IMAGE="${AXIA_IMAGE:-${AXIA_APP_IMAGE:?Define AXIA_IMAGE para usar EVIDENCE_VOLUME}}"
  existing="$(docker run --rm -v "$EVIDENCE_VOLUME:/data/evidence" "$IMAGE" find /data/evidence -mindepth 1 -maxdepth 1 -print -quit)"
  [[ -z "$existing" ]] || fail 'El volumen de evidencias destino no está vacío.'
  docker run --rm -i -v "$EVIDENCE_VOLUME:/data/evidence" "$IMAGE" tar --no-same-owner -C /data/evidence -xzf - < "$BACKUP_FILE"
else
  existing="$(compose run --rm --no-deps -T app find /data/evidence -mindepth 1 -maxdepth 1 -print -quit)"
  [[ -z "$existing" ]] || fail 'El volumen de evidencias destino no está vacío.'
  compose run --rm --no-deps -T app tar --no-same-owner -C /data/evidence -xzf - < "$BACKUP_FILE"
fi
echo 'Evidencias restauradas.'
