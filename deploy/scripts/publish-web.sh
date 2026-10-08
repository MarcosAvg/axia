#!/usr/bin/env bash
# Construye el frontend con las variables de producción y lo copia al servidor.
# Uso:
#   cp deploy/.env.production.example deploy/.env.production   # y edítalo
#   set -a && . deploy/.env.production && set +a
#   DEPLOY_TARGET='usuario@host:/srv/axia/web' ./deploy/scripts/publish-web.sh
set -euo pipefail

: "${VITE_SUPABASE_URL:?Define VITE_SUPABASE_URL}"
: "${VITE_SUPABASE_ANON_KEY:?Define VITE_SUPABASE_ANON_KEY}"
: "${DEPLOY_TARGET:?Define DEPLOY_TARGET (usuario@host:/ruta/del/sitio)}"

echo "Construyendo el frontend…"
pnpm --filter @axia/web build

echo "Copiando a ${DEPLOY_TARGET}…"
rsync -az --delete apps/web/dist/ "$DEPLOY_TARGET"

echo "Frontend publicado."
