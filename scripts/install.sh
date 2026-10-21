#!/usr/bin/env bash
# Instalación local de Axia sobre PostgreSQL propio.
# Genera secretos, levanta db/migrate/app y deja la API lista para el primer administrador.
# No toca producción ni la nube. Uso:
#   ./scripts/install.sh [--demo] [--dry-run]
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${AXIA_ENV_FILE:-$ROOT_DIR/.env}"
COMPOSE=(docker compose --env-file "$ENV_FILE" -f "$ROOT_DIR/compose.yaml" -f "$ROOT_DIR/compose.dev.yaml")
APP_PORT="${APP_PORT:-3100}"
DB_PORT="${DB_PORT:-5433}"
DRY_RUN=0
DEMO=0

usage() {
  sed -n '2,6p' "$0"
}

for arg in "$@"; do
  case "$arg" in
    --demo) DEMO=1 ;;
    --dry-run) DRY_RUN=1 ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Opción desconocida: $arg" >&2
      exit 2
      ;;
  esac
done

fail() {
  echo "✗ $*" >&2
  exit 1
}

info() { printf '→ %s\n' "$*"; }
ok() { printf '✓ %s\n' "$*"; }

[[ -f "$ROOT_DIR/compose.yaml" ]] || fail "Ejecuta el script desde el repositorio de Axia"
command -v docker >/dev/null || fail "Falta Docker"
command -v openssl >/dev/null || fail "Falta openssl"
docker compose version >/dev/null 2>&1 || fail "Falta Docker Compose v2"

if [[ -e "$ENV_FILE" ]]; then
  fail "Ya existe $ENV_FILE; no se sobrescriben secretos. Muévelo o usa AXIA_ENV_FILE."
fi

if ((!DRY_RUN)) && docker volume inspect axia_axia_db_data >/dev/null 2>&1; then
  fail "Ya existe el volumen de datos axia_axia_db_data. Recupera el .env original; no se regeneran secretos sobre una base existente."
fi

if ((DRY_RUN)); then
  info "Dry-run: se generarían secretos y $ENV_FILE"
  info "Dry-run: ${COMPOSE[*]} build"
  info "Dry-run: ${COMPOSE[*]} up -d db"
  info "Dry-run: ${COMPOSE[*]} run --rm migrate"
  info "Dry-run: ${COMPOSE[*]} up -d app"
  ((DEMO)) && info "Dry-run: ${COMPOSE[*]} run --rm migrate node dist/db/seed-demo/cli.js --demo"
  exit 0
fi

info "Verificando Docker…"
docker info >/dev/null 2>&1 || fail "Docker no responde; revisa el servicio o el grupo docker"

info "Generando secretos en $ENV_FILE…"
umask 077
cp "$ROOT_DIR/.env.example" "$ENV_FILE"
owner_password="$(openssl rand -hex 32)"
app_password="$(openssl rand -hex 32)"
sed -i \
  -e "s|^POSTGRES_OWNER_PASSWORD=.*|POSTGRES_OWNER_PASSWORD=$owner_password|" \
  -e "s|^AXIA_APP_PASSWORD=.*|AXIA_APP_PASSWORD=$app_password|" \
  -e "s|^DB_PORT=.*|DB_PORT=$DB_PORT|" \
  -e "s|^APP_PORT=.*|APP_PORT=$APP_PORT|" \
  -e "s|^MIGRATION_DATABASE_URL=.*|MIGRATION_DATABASE_URL=postgres://axia_owner:$owner_password@127.0.0.1:$DB_PORT/axia|" \
  -e "s|^DATABASE_URL=.*|DATABASE_URL=postgres://axia_app:$app_password@127.0.0.1:$DB_PORT/axia|" \
  "$ENV_FILE"
chmod 600 "$ENV_FILE"
configured_app_port="$(sed -n 's/^APP_PORT=//p' "$ENV_FILE" | tail -1)"
APP_PORT="${configured_app_port:-$APP_PORT}"
ok "Secretos generados; no se imprimen en pantalla."

info "Construyendo imágenes…"
"${COMPOSE[@]}" build

info "Levantando PostgreSQL…"
"${COMPOSE[@]}" up -d db

info "Aplicando migraciones y semilla de referencia…"
"${COMPOSE[@]}" run --rm migrate

info "Levantando la API…"
"${COMPOSE[@]}" up -d app

info "Esperando a que la API responda…"
ready=0
for _ in $(seq 1 30); do
  if "${COMPOSE[@]}" exec -T app node -e \
    "fetch('http://127.0.0.1:3100/api/health/ready').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))" \
    >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 2
done
((ready)) || {
  "${COMPOSE[@]}" logs --tail=80 app >&2 || true
  fail "La API no quedó lista; revisa los logs anteriores"
}
ok "API lista en http://127.0.0.1:$APP_PORT"

if ((DEMO)); then
  info "Cargando semilla de demostración…"
  demo_env=()
  if [[ -n "${AXIA_DEMO_PASSWORD:-}" ]]; then
    demo_env=(-e AXIA_DEMO_PASSWORD)
  fi
  "${COMPOSE[@]}" run --rm "${demo_env[@]}" migrate \
    node dist/db/seed-demo/cli.js --demo
fi

info "Primer administrador:"
cat <<EOF
  curl -sS -X POST http://127.0.0.1:$APP_PORT/api/setup \\
    -H 'content-type: application/json' \\
    -d '{"username":"admin","fullName":"Administrador","password":"<tu-contraseña>"}'
EOF
ok "Instalación terminada. Guarda $ENV_FILE fuera de Git y respáldalo."
