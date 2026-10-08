// Escribe `apps/web/.env.local` con la URL y la clave pública del Supabase local.
// Evita copiar valores a mano: `pnpm env:local` (requiere `pnpm db:start`).
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const raw = execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], {
  cwd: root,
  encoding: 'utf8',
})
const status = JSON.parse(raw)

const content = [
  '# Generado por scripts/write-local-env.mjs. No editar a mano ni subir al repositorio.',
  `VITE_SUPABASE_URL=${status.API_URL}`,
  `VITE_SUPABASE_ANON_KEY=${status.ANON_KEY}`,
  '',
].join('\n')

writeFileSync(join(root, 'apps/web/.env.local'), content)
console.log(
  'Escrito apps/web/.env.local con la configuración del Supabase local.',
)
