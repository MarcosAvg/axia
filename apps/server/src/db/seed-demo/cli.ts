import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { Client } from 'pg'

import { seedDemo, type DemoSeedResult } from './index.js'

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', 'db'])

export type DemoCliOptions = {
  connectionString: string
  password?: string
  resetPasswords: boolean
}

function localConnectionString(raw: string) {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error('MIGRATION_DATABASE_URL no es una URL válida')
  }
  if (!LOCAL_HOSTS.has(url.hostname)) {
    throw new Error(
      'La semilla demo solo se ejecuta contra una base local (127.0.0.1, localhost o el servicio db de Compose)',
    )
  }
  return url.toString()
}

export function parseDemoCli(
  argv: string[],
  env: NodeJS.ProcessEnv,
): DemoCliOptions {
  if (env.NODE_ENV === 'production') {
    throw new Error('La semilla demo no se ejecuta con NODE_ENV=production')
  }
  if (!argv.includes('--demo')) {
    throw new Error(
      'La semilla demo es explícita: ejecuta `pnpm db:demo -- --demo` (o `pnpm db:next:demo -- --demo`)',
    )
  }
  if (!env.MIGRATION_DATABASE_URL) {
    throw new Error('Define MIGRATION_DATABASE_URL')
  }
  return {
    connectionString: localConnectionString(env.MIGRATION_DATABASE_URL),
    password: env.AXIA_DEMO_PASSWORD,
    resetPasswords: argv.includes('--reset-passwords'),
  }
}

function printResult(result: DemoSeedResult) {
  process.stdout.write(
    `Demo lista: ${result.usersCreated} usuarios nuevos, ${result.ticketsCreated} tiquets nuevos, ${result.ticketsSkipped} ya existentes.\n`,
  )
  process.stdout.write(
    'Usuarios: demo.supervisor, demo.technician, demo.requester\n',
  )
  if (result.passwordApplied && result.passwordGenerated) {
    process.stdout.write(
      `Contraseña temporal de esta ejecución: ${result.password}\n`,
    )
    process.stdout.write(
      'Guárdala solo en tu equipo. Usa --reset-passwords para generar otra.\n',
    )
  } else if (!result.passwordApplied) {
    process.stdout.write(
      'Los usuarios demo ya existían; no se cambió su contraseña. Usa --reset-passwords para cambiarla.\n',
    )
  }
}

export async function runDemoSeedCli(argv: string[], env: NodeJS.ProcessEnv) {
  const options = parseDemoCli(argv, env)
  const client = new Client({ connectionString: options.connectionString })
  await client.connect()
  try {
    const result = await seedDemo(client, {
      password: options.password,
      resetPasswords: options.resetPasswords,
    })
    printResult(result)
    return result
  } finally {
    await client.end()
  }
}

const entry = process.argv[1]
if (entry && import.meta.url === pathToFileURL(resolve(entry)).href) {
  runDemoSeedCli(process.argv.slice(2), process.env).catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  })
}
