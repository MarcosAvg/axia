#!/usr/bin/env bash
# Prepara el entorno de desarrollo; no inicia servidores HTTP.
# Uso: ./scripts/install.sh [--demo] [--dry-run]
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${AXIA_ENV_FILE:-$ROOT_DIR/.env.dev}"
DRY_RUN=0
DEMO=0
for arg in "$@"; do
  case "$arg" in
    --demo) DEMO=1 ;;
    --dry-run) DRY_RUN=1 ;;
    -h|--help) sed -n '2,3p' "$0"; exit 0 ;;
    *) echo "Opción desconocida: $arg" >&2; exit 2 ;;
  esac
done
[[ ! -e "$ENV_FILE" ]] || { echo 'El archivo de entorno ya existe; no se sobrescribe.' >&2; exit 1; }
if ((DRY_RUN)); then
  echo 'Dry-run: generar entorno de desarrollo y preparar PostgreSQL/migraciones; demo solo con --demo.'
  exit 0
fi
command -v openssl >/dev/null
# No generar credenciales nuevas sobre una base de desarrollo existente.
if docker volume inspect axia-dev_dev_db_data >/dev/null 2>&1; then
  echo 'Ya existe la base de desarrollo; recupera su archivo .env.dev original.' >&2
  exit 1
fi
umask 077
cp "$ROOT_DIR/.env.dev.example" "$ENV_FILE"
owner_password="$(openssl rand -hex 32)"
app_password="$(openssl rand -hex 32)"
db_port="${DB_PORT:-5433}"
sed -i \
  -e "s|CHANGE_ME_OWNER|$owner_password|g" \
  -e "s|CHANGE_ME_APP|$app_password|g" \
  -e "s|5433|$db_port|g" \
  "$ENV_FILE"
chmod 600 "$ENV_FILE"
args=(--prepare-only)
((DEMO)) && args+=(--demo)
AXIA_ENV_FILE="$ENV_FILE" node "$ROOT_DIR/scripts/dev.mjs" "${args[@]}"
if ((DEMO)); then
  echo 'Demo preparada. Inicia pnpm dev e ingresa con demo.admin y la contraseña de la semilla.'
else
  echo 'Entorno vacío preparado. Inicia pnpm dev y crea el primer administrador en /login.'
fi
