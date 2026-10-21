import { pathToFileURL } from 'node:url'

import type { FastifyInstance } from 'fastify'
import type { Pool } from 'pg'

import { buildApp } from './app.js'
import { createAuthService } from './auth/service.js'
import { createCatalogService } from './catalogs/service.js'
import { createEvidenceService } from './evidence/service.js'
import { createEventBridge } from './realtime/bridge.js'
import { createEventHub } from './realtime/hub.js'
import { loadConfig, type AppConfig } from './config.js'
import { createDb } from './db/client.js'
import { checkDatabase } from './db/health.js'
import { createTicketService } from './tickets/service.js'

function installShutdownHandlers(
  app: FastifyInstance,
  pool: Pool,
  config: AppConfig,
  closeRealtime?: () => Promise<void>,
) {
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
      await closeRealtime?.()
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
}

async function main() {
  const config = loadConfig()
  const { pool, db } = createDb(config.DATABASE_URL)
  const auth = createAuthService(db, config)
  const tickets = createTicketService(db)
  const catalogs = createCatalogService(db)
  const evidence = createEvidenceService(db, config)
  const events = createEventHub(db)
  const app = await buildApp({
    config,
    auth,
    db,
    tickets,
    catalogs,
    evidence,
    realtime: { db, events },
    sync: { db },
    readiness: () => checkDatabase(pool, config.HEALTH_TIMEOUT_MS),
  })
  const bridge = createEventBridge(config.DATABASE_URL, events)
  await bridge.start()

  installShutdownHandlers(app, pool, config, bridge.stop)

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
