import { pathToFileURL } from 'node:url'

import { buildApp } from './app.js'
import { createAuthService } from './auth/service.js'
import { loadConfig } from './config.js'
import { createDb } from './db/client.js'
import { checkDatabase } from './db/health.js'

async function main() {
  const config = loadConfig()
  const { pool, db } = createDb(config.DATABASE_URL)
  const auth = createAuthService(db, config)
  const app = await buildApp({
    config,
    auth,
    readiness: () => checkDatabase(pool, config.HEALTH_TIMEOUT_MS),
  })

  let shuttingDown = false

  async function shutdown(signal: string) {
    if (shuttingDown) return
    shuttingDown = true
    app.log.info({ signal }, 'shutting down')

    const force = setTimeout(() => {
      app.log.error('forced shutdown after timeout')
      process.exit(1)
    }, config.SHUTDOWN_TIMEOUT_MS)
    force.unref()

    try {
      await app.close()
      await pool.end()
      clearTimeout(force)
      process.exit(0)
    } catch (error) {
      app.log.error({ err: error }, 'shutdown failed')
      process.exit(1)
    }
  }

  process.once('SIGTERM', () => {
    void shutdown('SIGTERM')
  })
  process.once('SIGINT', () => {
    void shutdown('SIGINT')
  })
  process.on('unhandledRejection', (reason) => {
    app.log.error({ err: reason }, 'unhandled rejection')
    void shutdown('unhandledRejection')
  })
  process.on('uncaughtException', (error) => {
    app.log.fatal({ err: error }, 'uncaught exception')
    void shutdown('uncaughtException')
  })

  try {
    const address = await app.listen({
      host: config.HOST,
      port: config.PORT,
    })
    app.log.info({ address }, 'Axia server listening')
  } catch (error) {
    app.log.fatal({ err: error }, 'could not start server')
    await pool.end()
    process.exitCode = 1
  }
}

const entrypoint = process.argv[1]
if (entrypoint && import.meta.url === pathToFileURL(entrypoint).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  })
}
