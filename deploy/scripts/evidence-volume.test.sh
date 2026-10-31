#!/usr/bin/env bash
# Prueba Docker desechable del propietario de evidencias, sin app ni base.
set -euo pipefail
: "${AXIA_IMAGE:?Selecciona una imagen local de Axia}"
umask 077
TEST_DIR="$(mktemp -d)"
SOURCE_VOLUME="axia-evidence-source-test-$$"
TARGET_VOLUME="axia-evidence-target-test-$$"
finish() {
  local status=$?
  trap - EXIT
  docker volume rm "$SOURCE_VOLUME" "$TARGET_VOLUME" >/dev/null || status=1
  rm -r -- "$TEST_DIR"
  exit "$status"
}
trap finish EXIT
docker volume create "$SOURCE_VOLUME" >/dev/null
docker volume create "$TARGET_VOLUME" >/dev/null
run() {
  docker run --rm --cap-drop ALL --security-opt no-new-privileges:true "$@"
}
run -v "$SOURCE_VOLUME:/data/evidence" "$AXIA_IMAGE" sh -c 'test "$(id -u)" != 0; printf "evidencia-testigo" > /data/evidence/witness'
run -v "$SOURCE_VOLUME:/data/evidence:ro" "$AXIA_IMAGE" tar -C /data/evidence -czf - . > "$TEST_DIR/evidence.tgz"
# RED: root sin DAC_OVERRIDE/CHOWN no puede escribir en el directorio de node 0755.
if run -i --user 0 -v "$TARGET_VOLUME:/data/evidence" "$AXIA_IMAGE" tar -C /data/evidence -xzf - < "$TEST_DIR/evidence.tgz" > "$TEST_DIR/root.log" 2>&1; then
  echo 'No se reprodujo el fallo del usuario root sin capacidades.' >&2
  exit 1
fi
# GREEN: mismo usuario que posee el volumen, sin intentar preservar otro propietario.
run -i -v "$TARGET_VOLUME:/data/evidence" "$AXIA_IMAGE" tar --no-same-owner -C /data/evidence -xzf - < "$TEST_DIR/evidence.tgz"
run -v "$TARGET_VOLUME:/data/evidence" "$AXIA_IMAGE" sh -c '
  test "$(cat /data/evidence/witness)" = evidencia-testigo
  test "$(stat -c %u /data/evidence/witness)" = "$(id -u)"
  printf "otra-evidencia" > /data/evidence/second
'
echo 'OK: RED root sin capacidades; GREEN evidencias restauradas por su propietario sin capacidades'
