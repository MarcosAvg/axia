#!/usr/bin/env bash
# Ejecutar desde el directorio de la instancia instalada.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/compose-operations.sh"

PUBLIC_URL="${AXIA_PUBLIC_URL:?Define AXIA_PUBLIC_URL con el origen público HTTPS}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_MAX_AGE_HOURS="${BACKUP_MAX_AGE_HOURS:-26}"
DEPLOY_MIN_FREE_KIB="${DEPLOY_MIN_FREE_KIB:-1048576}"
[[ "$PUBLIC_URL" =~ ^https://[a-zA-Z0-9.-]+(:[0-9]+)?/?$ ]] || fail 'AXIA_PUBLIC_URL debe ser un origen HTTPS.'
[[ "$BACKUP_MAX_AGE_HOURS" =~ ^[1-9][0-9]{0,5}$ ]] || fail 'BACKUP_MAX_AGE_HOURS debe ser un entero positivo.'
[[ "$DEPLOY_MIN_FREE_KIB" =~ ^[1-9][0-9]{0,11}$ ]] || fail 'DEPLOY_MIN_FREE_KIB debe ser un entero positivo.'

status=0
check() {
  local label="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    printf 'OK [%s]\n' "$label"
  else
    printf 'ERROR [%s]\n' "$label" >&2
    status=1
  fi
}

recent_backup() {
  local manifest dump evidence stamp epoch now lower
  now="$(date -u +%s)" || return
  lower=$((now - BACKUP_MAX_AGE_HOURS * 3600))
  for manifest in "$BACKUP_DIR"/axia-*/manifest; do
    valid_backup_manifest "$manifest" || continue
    dump="${manifest%/*}/database.dump"
    evidence="${manifest%/*}/evidence.tgz"
    [[ -f "$dump" && -s "$dump" && ! -L "$dump" ]] || continue
    [[ -f "$evidence" && -s "$evidence" && ! -L "$evidence" ]] || continue
    stamp="$(manifest_value "$manifest" created_at)"
    [[ "$stamp" =~ ^([0-9]{4})([0-9]{2})([0-9]{2})T([0-9]{2})([0-9]{2})([0-9]{2})Z$ ]] || continue
    epoch="$(date -u -d "${BASH_REMATCH[1]}-${BASH_REMATCH[2]}-${BASH_REMATCH[3]} ${BASH_REMATCH[4]}:${BASH_REMATCH[5]}:${BASH_REMATCH[6]}" +%s)" || continue
    if (( epoch >= lower && epoch <= now )); then return 0; fi
  done
  return 1
}

free_space() {
  df -Pk "$1" | awk -v minimum="$DEPLOY_MIN_FREE_KIB" 'NR == 2 { ok = ($4 >= minimum) } END { exit !ok }'
}

check_public_https() {
  local http
  http="$(curl --fail --silent --max-time 8 --proto '=https' --output /dev/null --write-out '%{http_code}' "${PUBLIC_URL%/}/api/health/live")" || return
  [[ "$http" == 200 ]]
}

check HTTPS check_public_https
check PostgreSQL compose exec -T app node -e "
  fetch('http://127.0.0.1:3100/api/health/ready', { signal: AbortSignal.timeout(5000) })
    .then((r) => process.exit(r.ok ? 0 : 1))
    .catch(() => process.exit(1))
"
check Evidencias compose exec -T app sh -ec '
  probe="$(mktemp /data/evidence/.axia-check.XXXXXXXX)"
  trap '\''rm -f -- "$probe"'\'' EXIT
  printf check > "$probe"
  df -Pk /data/evidence | awk -v minimum="$1" '\''NR == 2 { ok = ($4 >= minimum) } END { exit !ok }'\''
' sh "$DEPLOY_MIN_FREE_KIB"
check 'Espacio PostgreSQL' compose exec -T db sh -ec '
  df -Pk "$PGDATA" | awk -v minimum="$1" '\''NR == 2 { ok = ($4 >= minimum) } END { exit !ok }'\''
' sh "$DEPLOY_MIN_FREE_KIB"
check 'Espacio respaldos' free_space "$BACKUP_DIR"
check Respaldo recent_backup
exit "$status"
