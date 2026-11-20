#!/usr/bin/env bash
# Instalación, actualización y recuperación en proyectos desechables.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARCHIVE="$(realpath "${1:?Indica el paquete de la release de origen}")"
CANDIDATE="${2:?Indica la imagen candidata local con etiqueta del commit}"
FIXTURE="$ROOT/apps/server/test/deploy/upgrade-fixture.mjs"
SCRATCH="$(mktemp -d)"
PROJECT="axia-upgrade-$(date +%s)-$RANDOM"
export AXIA_ENV_FILE=/dev/null
export POSTGRES_OWNER_PASSWORD=upgrade-owner-test AXIA_APP_PASSWORD=upgrade-app-test
export POSTGRES_OWNER_USER=axia_owner POSTGRES_DB=axia
unset AXIA_COMPOSE_FILE COMPOSE_FILE AXIA_IMAGE MOVING_TAG

compose() { docker compose --env-file /dev/null "$@"; }
cleanup() {
  local result=$?
  trap - EXIT
  if [[ -n "${COMPOSE_FILE:-}" && -n "${AXIA_IMAGE:-}" ]]; then
    if (( result != 0 )); then compose logs --no-color --tail=80 app >&2 || true; fi
    COMPOSE_PROJECT_NAME="$PROJECT" compose down -v --remove-orphans >/dev/null 2>&1 || true
    COMPOSE_PROJECT_NAME="$PROJECT-recovery" compose down -v --remove-orphans >/dev/null 2>&1 || true
  fi
  if [[ -n "${MOVING_TAG:-}" ]]; then docker image rm "$MOVING_TAG" >/dev/null 2>&1 || true; fi
  rm -r -- "$SCRATCH"
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Se verifica el nombre esperado y el hash antes de extraer el paquete descargado.
archive_name="${ARCHIVE##*/}"
checksum="$(awk -v name="$archive_name" '$2 == name { print $1 }' "$ARCHIVE.sha256")"
[[ "$checksum" =~ ^[a-f0-9]{64}$ ]]
printf '%s  %s\n' "$checksum" "$ARCHIVE" | sha256sum -c -
mkdir "$SCRATCH/origin"
tar -xzf "$ARCHIVE" -C "$SCRATCH/origin"
origin_metadata="$SCRATCH/origin/release.json"
ORIGIN="$(node -p 'require(process.argv[1]).image' "$origin_metadata")"
ORIGIN_VERSION="$(node -p 'require(process.argv[1]).version' "$origin_metadata")"
[[ "$ORIGIN" =~ ^[a-z0-9][a-z0-9./:_-]*@sha256:[a-f0-9]{64}$ ]]
revision="${CANDIDATE##*:}"
[[ "$revision" =~ ^[a-f0-9]{40}$ ]]
docker image inspect "$CANDIDATE" >/dev/null
node "$ROOT/scripts/package-release.mjs" "$SCRATCH/candidate" "$CANDIDATE" "$revision" "$revision"

cat > "$SCRATCH/networks.yaml" <<'YAML'
networks:
  proxy:
    external: false
    name: ${COMPOSE_PROJECT_NAME}_proxy
YAML
cat > "$SCRATCH/failure.yaml" <<'YAML'
services:
  app:
    restart: "no"
    environment:
      MIGRATION_DATABASE_URL: postgresql://127.0.0.1:1/axia
YAML

export COMPOSE_PROJECT_NAME="$PROJECT"
export COMPOSE_FILE="$SCRATCH/origin/compose.yaml:$SCRATCH/networks.yaml"
export AXIA_IMAGE="$ORIGIN"
compose pull app
MOVING_TAG="${ORIGIN%@*}:$PROJECT"
docker image tag "$ORIGIN" "$MOVING_TAG"
export AXIA_IMAGE="$MOVING_TAG"
compose up -d --wait --wait-timeout 120
fixture="$(compose exec -T app node --input-type=module - create < "$FIXTURE")"
maintenance_start="$SECONDS"
BACKUP_DIR="$SCRATCH/backups" bash "$SCRATCH/candidate/deploy/scripts/backup-all.sh"
sets=("$SCRATCH"/backups/axia-*)
[[ "${#sets[@]}" == 1 && -f "${sets[0]}/manifest" ]]
grep -Fxq "image_digest=$ORIGIN" "${sets[0]}/manifest"

export COMPOSE_FILE="$SCRATCH/candidate/compose.yaml:$SCRATCH/networks.yaml"
export AXIA_IMAGE="$CANDIDATE"
docker image tag "$CANDIDATE" "$MOVING_TAG"
compose up -d --wait --wait-timeout 120
compose exec -T app node --input-type=module - check "$fixture" < "$FIXTURE"
printf 'Ventana sintética de respaldo y actualización: %s s.\n' "$((SECONDS - maintenance_start))"

# Un fallo del runner debe detener el arranque antes de que Fastify pueda servir tráfico.
export COMPOSE_FILE="$COMPOSE_FILE:$SCRATCH/failure.yaml"
compose up -d --no-deps --force-recreate app
failed_app="$(compose ps -aq app)"
[[ "$(timeout 30 docker wait "$failed_app")" == 1 ]]
[[ -z "$(compose ps --status running -q app)" ]]
failure_logs="$(compose logs --no-color app)"
[[ "$failure_logs" == *ECONNREFUSED* && "$failure_logs" != *'Axia server listening'* ]]

recovery_start="$SECONDS"
export COMPOSE_PROJECT_NAME="$PROJECT-recovery"
export COMPOSE_FILE="$SCRATCH/origin/compose.yaml:$SCRATCH/networks.yaml"
export AXIA_IMAGE="$ORIGIN"
compose pull app
bash "$SCRATCH/candidate/deploy/scripts/restore-all.sh" "${sets[0]}"
compose up -d --wait --wait-timeout 120
compose exec -T app node --input-type=module - check "$fixture" < "$FIXTURE"
printf 'Recuperación en proyecto nuevo con un tiquet y una evidencia: %s s.\n' "$((SECONDS - recovery_start))"
printf 'Actualización y recuperación verificadas desde %s hacia %s.\n' "$ORIGIN_VERSION" "$CANDIDATE"
