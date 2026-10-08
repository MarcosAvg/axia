#!/usr/bin/env bash
# Aplica las migraciones de Supabase a la base de producción.
# Uso: DATABASE_URL='postgresql://...' ./deploy/scripts/migrate.sh
set -euo pipefail

: "${DATABASE_URL:?Define DATABASE_URL (postgresql://usuario:clave@host:puerto/base)}"

echo "Aplicando migraciones en la base destino…"
# Debe ejecutarse desde la raíz del repositorio (necesita pnpm y el CLI de Supabase instalados).
pnpm exec supabase db push --db-url "$DATABASE_URL"

echo "Migraciones aplicadas."
