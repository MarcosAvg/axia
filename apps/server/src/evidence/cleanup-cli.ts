import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

import { loadConfig } from '../config.js'
import { createDb } from '../db/client.js'
import { cleanupPendingEvidence } from './cleanup.js'
import { storagePaths } from './paths.js'

async function main() {
  const envFile = new URL('../../../../.env', import.meta.url)
  if (existsSync(envFile)) process.loadEnvFile(envFile)

  const hours = Number(process.env.EVIDENCE_CLEANUP_HOURS ?? 24)
  if (!Number.isFinite(hours) || hours < 1) {
    throw new Error('EVIDENCE_CLEANUP_HOURS debe ser un número mayor que cero')
  }

  const config = loadConfig()
  const { db, pool } = createDb(config.DATABASE_URL)
  try {
    const result = await cleanupPendingEvidence(
      db,
      storagePaths(config.STORAGE_DIR),
      hours,
    )
    process.stdout.write(
      `Evidencias abandonadas marcadas: ${result.rows}. Revisa de nuevo si llegó al lote máximo.\n`,
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
