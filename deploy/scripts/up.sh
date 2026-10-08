#!/usr/bin/env bash
# Levanta el stack de Supabase autoalojado (compose oficial) y, si hay DATABASE_URL, migra.
# Uso:
#   ./deploy/scripts/up.sh            # levanta (y migra si DATABASE_URL está definido)
#   ./deploy/scripts/up.sh --dry-run  # muestra lo que haría, sin ejecutar
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SUPABASE_REF="${SUPABASE_REF:-master}"
COMPOSE_DIR="${COMPOSE_DIR:-$ROOT_DIR/deploy/supabase/docker}"
REPO_URL="${REPO_URL:-https://github.com/supabase/supabase}"

DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    -h | --help)
      sed -n '2,5p' "$0"
      exit 0
      ;;
    *)
      echo "Opción desconocida: $arg" >&2
      exit 2
      ;;
  esac
done

run() {
  if ((DRY_RUN)); then
    printf '  [dry-run] %s\n' "$*"
  else
    "$@"
  fi
}

echo "Repositorio: $ROOT_DIR"
echo "Compose de Supabase: $COMPOSE_DIR (ref: $SUPABASE_REF)"

if [[ ! -f "$COMPOSE_DIR/docker-compose.yml" ]]; then
  echo "Descargando el compose oficial de Supabase…"
  TMP_DIR="$(mktemp -d)"
  if ((DRY_RUN)); then
    printf '  [dry-run] git clone --depth 1 --branch %s %s %s\n' \
      "$SUPABASE_REF" "$REPO_URL" "$TMP_DIR/supabase"
    printf '  [dry-run] cp -rf %s/supabase/docker/. %s/\n' "$TMP_DIR" "$COMPOSE_DIR"
  else
    git clone --depth 1 --branch "$SUPABASE_REF" "$REPO_URL" "$TMP_DIR/supabase"
    mkdir -p "$COMPOSE_DIR"
    cp -rf "$TMP_DIR/supabase/docker/." "$COMPOSE_DIR/"
  fi
  rm -rf "$TMP_DIR"
else
  echo "El compose ya está descargado; no se toca."
fi

if [[ ! -f "$COMPOSE_DIR/.env" && -f "$COMPOSE_DIR/.env.example" ]]; then
  run cp "$COMPOSE_DIR/.env.example" "$COMPOSE_DIR/.env"
  echo "AVISO: edita $COMPOSE_DIR/.env y cambia TODOS los secretos antes de exponerlo."
fi

echo "Levantando el stack…"
if ((DRY_RUN)); then
  printf '  [dry-run] (cd %s && docker compose up -d)\n' "$COMPOSE_DIR"
else
  (cd "$COMPOSE_DIR" && docker compose up -d)
fi

if [[ -n "${DATABASE_URL:-}" ]]; then
  echo "Aplicando migraciones…"
  run "$ROOT_DIR/deploy/scripts/migrate.sh"
else
  echo "Sin DATABASE_URL: no se migra (hazlo luego con deploy/scripts/migrate.sh)."
fi

echo "Listo. Comprueba con: (cd $COMPOSE_DIR && docker compose ps)"
