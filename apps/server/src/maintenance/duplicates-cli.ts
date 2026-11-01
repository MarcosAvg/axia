import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

import { loadConfig } from '../config.js'
import { createDb } from '../db/client.js'
import { backfillDuplicateAlerts } from '../tickets/duplicate-alerts.js'

async function main() {
  const envFile =
    process.env.AXIA_ENV_FILE ??
    new URL('../../../../.env.dev', import.meta.url)
  if (existsSync(envFile)) process.loadEnvFile(envFile)

  const config = loadConfig()
  const { db, pool } = createDb(config.DATABASE_URL)
  try {
    const result = await backfillDuplicateAlerts(db)
    process.stdout.write(
      `Tiquets revisados: ${result.tickets}. Con candidatos: ${result.flagged}. Alertas nuevas: ${result.alerts}.\n`,
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
