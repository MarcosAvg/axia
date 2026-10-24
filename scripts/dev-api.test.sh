#!/usr/bin/env bash
# Comprueba que el arranque local del API no use la ruta del contenedor.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

mkdir -p "$TMP_DIR/bin"
cat >"$TMP_DIR/bin/pnpm" <<'EOF'
#!/usr/bin/env bash
printf 'STORAGE_DIR=%s\n' "${STORAGE_DIR:-}"
printf 'PORT=%s\n' "${PORT:-}"
EOF
chmod +x "$TMP_DIR/bin/pnpm"

printf 'STORAGE_DIR=/data/evidence\n' >"$TMP_DIR/.env"

OUT="$(PATH="$TMP_DIR/bin:$PATH" AXIA_ENV_FILE="$TMP_DIR/.env" "$ROOT_DIR/scripts/dev-api.sh")"
EXPECTED="STORAGE_DIR=$ROOT_DIR/apps/server/data/evidence"
grep -qxF "$EXPECTED" <<<"$OUT" || {
  echo "dev-api.sh debe usar $EXPECTED; obtuvo: $OUT" >&2
  exit 1
}
grep -qxF 'PORT=3100' <<<"$OUT" || {
  echo 'dev-api.sh debe usar el puerto 3100' >&2
  exit 1
}

OUT="$(PATH="$TMP_DIR/bin:$PATH" AXIA_DEV_STORAGE_DIR="$TMP_DIR/evidence" "$ROOT_DIR/scripts/dev-api.sh")"
grep -qxF "STORAGE_DIR=$TMP_DIR/evidence" <<<"$OUT" || {
  echo 'dev-api.sh debe respetar AXIA_DEV_STORAGE_DIR' >&2
  exit 1
}

OUT="$(
  PATH="$TMP_DIR/bin:$PATH" \
    MIGRATION_DATABASE_URL='postgres://local/test' \
    AXIA_APP_PASSWORD='test' \
    DATABASE_URL='postgres://local/test' \
    "$ROOT_DIR/scripts/e2e-server.sh"
)"
grep -qxF "STORAGE_DIR=$ROOT_DIR/apps/server/data/evidence-e2e" <<<"$OUT" || {
  echo 'e2e-server.sh debe usar una ruta local de evidencias' >&2
  exit 1
}

echo 'dev-api.sh y e2e-server.sh: ruta local de evidencias verificada.'
