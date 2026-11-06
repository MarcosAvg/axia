import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

import { loadConfig } from '../config.js'
import { createDb } from '../db/client.js'
import { cleanupPendingAttachments } from './cleanup.js'
import { attachmentPaths } from './paths.js'

async function main() {
  const envFile =
    process.env.AXIA_ENV_FILE ??
    new URL('../../../../.env.dev', import.meta.url)
  if (existsSync(envFile)) process.loadEnvFile(envFile)

  const config = loadConfig()
  const { db, pool } = createDb(config.DATABASE_URL)
  try {
    const result = await cleanupPendingAttachments(
      db,
      attachmentPaths(config.STORAGE_DIR),
      config.ATTACHMENT_CLEANUP_HOURS,
    )
    process.stdout.write(
      `Adjuntos abandonados marcados: ${result.rows}. Revisa de nuevo si llegó al lote máximo.\n`,
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
