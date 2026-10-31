#!/usr/bin/env bash
# Regresión con Compose real, sin daemon, volúmenes ni archivos de secretos reales.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/compose-operations.sh"
export AXIA_COMPOSE_FILE="$ROOT_DIR/compose.yaml" AXIA_ENV_FILE=/dev/null
export AXIA_IMAGE=axia:compose-image-fixture
export POSTGRES_OWNER_PASSWORD=owner-fixture-only AXIA_APP_PASSWORD=app-fixture-only
unset COMPOSE_FILE COMPOSE_PROJECT_NAME
images="$(compose config --images app)"
[[ "$images" == *postgres:* ]] || fail 'La regresión debe incluir la imagen de la dependencia db.'
[[ "$(compose_image app)" == "$AXIA_IMAGE" ]] || fail 'No se seleccionó exactamente la imagen de app.'
[[ "$(compose_image migrate)" == "$AXIA_IMAGE" ]] || fail 'No se seleccionó exactamente la imagen del migrador.'
echo 'OK: selección de imágenes por servicio con dependencias en Compose real'
