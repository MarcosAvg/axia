// Limpia los datos creados por las pruebas e2e en la base local (tiquets y
// equipos con marca E2E). Es comodidad de desarrollo: en CI no hace nada y, si
// el contenedor no está disponible, avisa sin fallar.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

if (process.env.CI) {
  console.log('CI detectado: se omite la limpieza de datos de prueba.')
  process.exit(0)
}

function projectId() {
  try {
    const path = fileURLToPath(
      new URL('../supabase/config.toml', import.meta.url),
    )
    const config = readFileSync(path, 'utf8')
    return config.match(/^project_id\s*=\s*"([^"]+)"/m)?.[1] ?? 'axia'
  } catch {
    return 'axia'
  }
}

const container = process.env.DB_CONTAINER ?? `supabase_db_${projectId()}`

const sql = [
  'begin;',
  // Estas tablas son de solo agregar y bloquean el borrado en cascada.
  'alter table public.ticket_events disable trigger user;',
  'alter table public.evidence disable trigger user;',
  "delete from public.tickets where description ilike '%E2E%';",
  "delete from public.teams where name like 'Equipo E2E %';",
  'alter table public.ticket_events enable trigger user;',
  'alter table public.evidence enable trigger user;',
  'commit;',
].join(' ')

try {
  execFileSync(
    'docker',
    [
      'exec',
      '-i',
      container,
      'psql',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      sql,
    ],
    { stdio: 'inherit' },
  )
  console.log(`Datos de prueba eliminados (${container}).`)
} catch {
  console.warn(
    `No se pudieron limpiar los datos de prueba (contenedor ${container}). ¿Está Supabase local corriendo?`,
  )
}
