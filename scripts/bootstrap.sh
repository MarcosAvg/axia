#!/usr/bin/env bash
# Axia — arranque reproducible en un equipo nuevo.
# Idempotente: se puede correr las veces que haga falta. Ver docs/empezar-aqui.md.
set -euo pipefail

info() { printf '\033[1;34m→\033[0m %s\n' "$*"; }
ok() { printf '\033[1;32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; exit 1; }

# Estar en la raíz del repositorio.
[ -f package.json ] && [ -f pnpm-workspace.yaml ] \
  || fail "Ejecuta este script desde la raíz del repositorio (donde está pnpm-workspace.yaml)."

command -v node >/dev/null || fail "Falta Node.js (LTS). Instálalo y vuelve a intentar."
command -v corepack >/dev/null || fail "Falta corepack (viene con Node). Instala Node LTS."
command -v git >/dev/null || fail "Falta Git."
command -v docker >/dev/null || fail "Falta Docker (lo necesita el Supabase local)."

info "Node $(node -v)"

info "Activando pnpm con corepack…"
corepack enable

info "Instalando dependencias (pnpm install)…"
pnpm install

info "Comprobando Docker…"
if ! docker info >/dev/null 2>&1; then
  warn "No puedo hablar con Docker. Si es Linux, agrega tu usuario al grupo 'docker' y"
  warn "cierra y reabre la sesión:  sudo usermod -aG docker \$USER"
  fail "Docker no está disponible."
fi
ok "Docker responde."

info "Levantando Supabase local (la primera vez descarga las imágenes)…"
pnpm db:start

info "Aplicando migraciones y semilla (pnpm db:reset)…"
pnpm db:reset

info "Instalando el navegador de Playwright (Chromium)…"
pnpm --filter @axia/web exec playwright install chromium

if [ ! -f apps/web/.env.local ]; then
  warn "Crea apps/web/.env.local con VITE_SUPABASE_URL y la clave pública que imprime 'pnpm db:start'."
  warn "Puedes basarte en apps/web/.env.example."
fi

ok "Listo. Verificación recomendada:  pnpm check"
ok "Servidor de desarrollo:            pnpm dev  (http://localhost:5173)"
