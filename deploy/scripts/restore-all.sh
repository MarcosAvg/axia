#!/usr/bin/env bash
# Solo restaura a un destino vacío; mantiene app detenida ante cualquier fallo.
set -euo pipefail
umask 077
source "$(dirname "${BASH_SOURCE[0]}")/compose-operations.sh"
SET="${1:?Uso: restore-all.sh <directorio-del-conjunto>}"
[[ -f "$SET/manifest" && ! -L "$SET/manifest" ]] || fail 'Falta el manifiesto del conjunto.'
value() { sed -n "s/^$1=//p" "$SET/manifest"; }
[[ "$(value format)" == 1 ]] || fail 'Formato de respaldo no compatible.'
require_image
[[ "$(value image_id)" == "$IMAGE_ID" && "$(value image)" == "$AXIA_IMAGE" ]] || fail 'La imagen debe coincidir con la release del respaldo.'
for entry in database evidence; do
  file=database.dump
  [[ "$entry" != evidence ]] || file=evidence.tgz
  [[ -f "$SET/$file" && ! -L "$SET/$file" ]] || fail "Falta $file."
  expected="$(value "${entry}_sha256")"
  [[ "$expected" =~ ^[a-f0-9]{64}$ ]] || fail 'Checksum de manifiesto inválido.'
  [[ "$(sha256sum "$SET/$file" | cut -d' ' -f1)" == "$expected" ]] || fail "Integridad incorrecta: $file."
done
APP_WAS_RUNNING=''
RESTORE_COMPLETE=no
finish() {
  local status=$?
  trap - EXIT
  if [[ "$RESTORE_COMPLETE" == yes && -n "$APP_WAS_RUNNING" ]]; then compose start app || status=1; fi
  if [[ "$status" != 0 ]]; then echo 'Restauración incompleta; app permanece detenida. Reintenta en otro destino vacío.' >&2; fi
  exit "$status"
}
trap finish EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
stop_app
compose up -d --wait db
objects="$(database psql -At -v ON_ERROR_STOP=1 -c "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname !~ '^pg_' and n.nspname <> 'information_schema';")"
[[ "$objects" == 0 ]] || fail 'La base destino no está vacía. Usa otro proyecto y volúmenes nuevos.'
existing="$(compose run --rm --no-deps -T app find /data/evidence -mindepth 1 -maxdepth 1 -print -quit)"
[[ -z "$existing" ]] || fail 'El volumen de evidencias destino no está vacío.'
# El migrador de la misma release crea axia_app y todos los esquemas/permisos.
compose run --rm --no-deps -T migrate node dist/db/migrate.js
database pg_restore --single-transaction --exit-on-error --clean --if-exists --no-owner < "$SET/database.dump"
compose run --rm --no-deps -T app tar --no-same-owner -C /data/evidence -xzf - < "$SET/evidence.tgz"
RESTORE_COMPLETE=yes
echo 'Conjunto restaurado; verifica salud, conteos y evidencias antes de cambiar el proxy.'
