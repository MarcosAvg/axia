#!/usr/bin/env bash
# Comprobación sin Docker real: flags, dry-run y negativa a sobrescribir .env.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

mkdir -p "$TMP_DIR/bin"
cat >"$TMP_DIR/bin/docker" <<'EOF'
#!/usr/bin/env bash
if [[ "${1:-}" == "compose" && "${2:-}" == "version" ]]; then
  exit 0
fi
exit 0
EOF
chmod +x "$TMP_DIR/bin/docker"

PATH="$TMP_DIR/bin:$PATH" \
  AXIA_ENV_FILE="$TMP_DIR/.env" \
  "$ROOT_DIR/scripts/install.sh" --dry-run >"$TMP_DIR/out"

grep -q 'Dry-run' "$TMP_DIR/out"
[[ ! -e "$TMP_DIR/.env" ]] || {
  echo 'El dry-run no debe escribir .env' >&2
  exit 1
}

touch "$TMP_DIR/.env"
if PATH="$TMP_DIR/bin:$PATH" \
  AXIA_ENV_FILE="$TMP_DIR/.env" \
  "$ROOT_DIR/scripts/install.sh" --dry-run >/dev/null 2>&1; then
  echo 'No debe sobrescribir un .env existente' >&2
  exit 1
fi

echo 'install.sh: dry-run y protección de .env verificados.'
