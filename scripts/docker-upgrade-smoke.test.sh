#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRATCH="$(mktemp -d)"
trap 'rm -r -- "$SCRATCH"' EXIT
export DOCKER_TRACE="$SCRATCH/docker.trace"
cat > "$SCRATCH/docker" <<'MOCK'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$DOCKER_TRACE"
MOCK
chmod +x "$SCRATCH/docker"
export PATH="$SCRATCH:$PATH"
export COMPOSE_PROJECT_NAME=instancia-existente COMPOSE_FILE=compose.yaml
export AXIA_IMAGE=axia:instalada MOVING_TAG=axia:importante
archive="$SCRATCH/axia-self-hosted.tar.gz"
printf 'archivo inválido' > "$archive"
printf '%064d  axia-self-hosted.tar.gz\n' 0 > "$archive.sha256"
if bash "$ROOT/scripts/docker-upgrade-smoke.sh" "$archive" axia:candidata > "$SCRATCH/output" 2>&1; then
  echo 'La prueba aceptó un checksum inválido' >&2
  exit 1
fi
[[ ! -e "$DOCKER_TRACE" ]] || { cat "$DOCKER_TRACE" >&2; exit 1; }
echo 'OK: un paquete inválido no toca el proyecto ni las imágenes del operador'
