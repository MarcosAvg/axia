#!/usr/bin/env bash
# Compartido por los scripts; no carga ni imprime archivos de secretos.
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
compose() {
  local args=()
  [[ -z "${AXIA_COMPOSE_FILE:-}" ]] || args+=(-f "$AXIA_COMPOSE_FILE")
  [[ -z "${AXIA_ENV_FILE:-}" ]] || args+=(--env-file "$AXIA_ENV_FILE")
  (cd "$ROOT_DIR" && docker compose "${args[@]}" "$@")
}
fail() { echo "$*" >&2; exit 1; }
compose_image() {
  # Compose incluye dependencias incluso al filtrar servicios. Consumir todo el flujo
  # evita SIGPIPE y solo deja salir la referencia pública del servicio solicitado.
  compose config --format yaml "$1" | awk -v wanted="$1" '
    /^[^ ]/ { in_services = ($0 == "services:") }
    in_services && /^  [^ ]/ { selected = ($0 == "  " wanted ":") }
    in_services && selected && /^    image:/ {
      image = $0
      sub(/^    image: */, "", image)
      quote = substr(image, 1, 1)
      if ((quote == "\"" || quote == sprintf("%c", 39)) && substr(image, length(image), 1) == quote) {
        image = substr(image, 2, length(image) - 2)
      }
      count++
    }
    END { if (count != 1 || image == "") exit 1; print image }
  '
}
require_image() {
  local configured_image
  configured_image="$(compose_image app)"
  AXIA_IMAGE="${AXIA_IMAGE:-$configured_image}"
  [[ -n "$AXIA_IMAGE" && "$AXIA_IMAGE" == "$configured_image" ]] || fail 'La imagen debe coincidir con la configuración de app.'
  IMAGE_ID="$(docker image inspect --format '{{.Id}}' "$AXIA_IMAGE")"
}
database() {
  compose exec -T db sh -c 'exec "$@" -U "$POSTGRES_USER" -d "$POSTGRES_DB"' sh "$@"
}
stop_app() {
  local container project jobs
  container="$(compose ps -q db)"
  if [[ -n "$container" ]]; then
    project="$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' "$container")"
    jobs="$(docker ps -q --filter "label=com.docker.compose.project=$project" --filter label=com.docker.compose.oneoff=True)"
    [[ -z "$jobs" ]] || fail 'Hay trabajos operativos activos; espera a que terminen y reintenta.'
  fi
  APP_WAS_RUNNING="$(compose ps --status running -q app)"
  if [[ -n "$APP_WAS_RUNNING" ]]; then
    [[ "$(docker inspect --format '{{.Image}}' "$APP_WAS_RUNNING")" == "$IMAGE_ID" ]] || fail 'La app activa usa otra imagen; selecciona su misma release.'
    compose stop app
    container="$(compose ps -aq app)"
    [[ "$(docker inspect --format '{{.State.ExitCode}}' "$container")" == 0 ]] || fail 'La aplicación no terminó limpiamente; no se toman ni restauran datos.'
  fi
}
