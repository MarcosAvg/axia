#!/usr/bin/env bash
# Axia — arranque reproducible en un equipo nuevo.
# Idempotente: instala dependencias y usa el instalador del stack propio.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

command -v node >/dev/null || { echo 'Falta Node.js LTS.' >&2; exit 1; }
command -v corepack >/dev/null || { echo 'Falta corepack.' >&2; exit 1; }
command -v docker >/dev/null || { echo 'Falta Docker.' >&2; exit 1; }

info() { printf '→ %s\n' "$*"; }

info "Activando pnpm…"
corepack enable

info "Instalando dependencias…"
pnpm install

info "Instalando Chromium para Playwright…"
pnpm --filter @axia/web exec playwright install chromium

info "Instalando el stack y la semilla demo…"
./scripts/install.sh --demo

printf '\nListo.\n'
printf 'Servidor de desarrollo: pnpm dev (http://localhost:5173)\n'
printf 'Primer administrador: abre /login o usa POST /api/setup\n'
