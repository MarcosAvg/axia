import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

import { loadConfig } from '../config.js'
import { createDb } from '../db/client.js'
import { cleanupRetention } from './retention.js'

function days(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback)
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} debe ser un entero mayor que cero`)
  }
  return value
}

async function main() {
  const envFile = new URL('../../../../.env', import.meta.url)
  if (existsSync(envFile)) process.loadEnvFile(envFile)

  const config = loadConfig()
  const { db, pool } = createDb(config.DATABASE_URL)
  try {
    const result = await cleanupRetention(db, {
      sessionDays: days('RETENTION_SESSION_DAYS', 30),
      loginAttemptDays: days('RETENTION_LOGIN_ATTEMPT_DAYS', 90),
      notificationDays: days('RETENTION_NOTIFICATION_DAYS', 90),
    })
    process.stdout.write(
      `Sesiones: ${result.sessions}. Intentos de acceso: ${result.loginAttempts}. Avisos leídos: ${result.notifications}.\n`,
    )
  } finally {
    await pool.end()
  }
}

const entrypoint = process.argv[1]
if (entrypoint && import.meta.url === pathToFileURL(entrypoint).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
