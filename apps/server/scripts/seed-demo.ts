import { Client } from 'pg'

import { seedDemo } from '../src/db/seed-demo/index.js'

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', 'db'])

function fail(message: string): never {
  console.error(`✗ ${message}`)
  process.exit(1)
}

function localUrl(raw: string): string {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return fail('MIGRATION_DATABASE_URL no es una URL válida')
  }
  if (!LOCAL_HOSTS.has(url.hostname)) {
    return fail(
      'La semilla demo solo se ejecuta contra una base local (127.0.0.1, localhost o el servicio db de Compose)',
    )
  }
  return url.toString()
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    fail('La semilla demo no se ejecuta con NODE_ENV=production')
  }
  if (!process.argv.includes('--demo')) {
    fail(
      'La semilla demo es explícita: ejecuta `pnpm db:demo -- --demo` (o `pnpm db:next:demo -- --demo`)',
    )
  }

  const rawUrl = process.env.MIGRATION_DATABASE_URL
  if (!rawUrl) fail('Define MIGRATION_DATABASE_URL')
  const connectionString = localUrl(rawUrl)
  const resetPasswords = process.argv.includes('--reset-passwords')

  const client = new Client({ connectionString })
  await client.connect()
  try {
    const result = await seedDemo(client, {
      password: process.env.AXIA_DEMO_PASSWORD,
      resetPasswords,
    })
    console.log(
      `Demo lista: ${result.usersCreated} usuarios nuevos, ${result.ticketsCreated} tiquets nuevos, ${result.ticketsSkipped} ya existentes.`,
    )
    console.log('Usuarios: demo.supervisor, demo.technician, demo.requester')
    if (result.passwordApplied && result.passwordGenerated) {
      console.log(`Contraseña temporal de esta ejecución: ${result.password}`)
      console.log(
        'Guárdala solo en tu equipo. Usa --reset-passwords para generar otra.',
      )
    } else if (!result.passwordApplied) {
      console.log(
        'Los usuarios demo ya existían; no se cambió su contraseña. Usa --reset-passwords para cambiarla.',
      )
    }
  } finally {
    await client.end()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
