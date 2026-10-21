import { randomUUID } from 'node:crypto'

import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from 'fastify'

import { registerAdminAccessRoutes } from './auth/access-routes.js'
import { registerAuthRoutes } from './auth/routes.js'
import type { AuthService } from './auth/service.js'
import { registerAdminCatalogRoutes } from './catalogs/admin-routes.js'
import { registerAdminCalendarRoutes } from './catalogs/calendar-routes.js'
import { registerAdminSettingsRoutes } from './catalogs/settings-routes.js'
import { registerCatalogRoutes } from './catalogs/routes.js'
import type { CatalogService } from './catalogs/service.js'
import { registerEvidenceRoutes } from './evidence/routes.js'
import type { EvidenceService } from './evidence/service.js'
import { createTusServer } from './evidence/tus.js'
import { registerNotificationRoutes } from './realtime/notifications.js'
import { registerRealtimeRoutes } from './realtime/routes.js'
import { registerSyncRoutes } from './sync/routes.js'
import type { EventHub } from './realtime/hub.js'
import type { Database } from './db/client.js'
import type { AppConfig } from './config.js'
import { errorHandler, registerNotFoundHandler } from './http/errors.js'
import { registerHealthRoutes, type ReadinessProbe } from './http/health.js'
import { registerMetricsRoutes } from './metrics/routes.js'
import { registerSecurity } from './http/security.js'
import { registerStatic } from './http/static.js'
import { registerTicketRoutes } from './tickets/routes.js'
import type { TicketService } from './tickets/service.js'

export type BuildAppOptions = {
  config: AppConfig
  readiness: ReadinessProbe
  auth?: AuthService
  db?: Database
  tickets?: TicketService
  catalogs?: CatalogService
  evidence?: EvidenceService
  realtime?: { db: Database; events: EventHub }
  sync?: { db: Database }
  logger?: FastifyServerOptions['logger']
}

function buildLogger(config: AppConfig): FastifyServerOptions['logger'] {
  if (config.NODE_ENV === 'test' || config.LOG_LEVEL === 'silent') {
    return false
  }

  return {
    level: config.LOG_LEVEL,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
      ],
      censor: '[redacted]',
    },
  }
}

type OptionalServices = {
  auth?: AuthService
  db?: Database
  tickets?: TicketService
  catalogs?: CatalogService
  evidence?: EvidenceService
  realtime?: { db: Database; events: EventHub }
  sync?: { db: Database }
}

async function registerCoreRoutes(
  app: FastifyInstance,
  config: AppConfig,
  { auth, db, tickets, catalogs }: OptionalServices,
) {
  if (auth) await registerAuthRoutes(app, auth, config)
  if (auth && db) {
    registerAdminAccessRoutes(app, auth, config, db)
    registerAdminCatalogRoutes(app, auth, config, db)
    registerAdminCalendarRoutes(app, auth, config, db)
    registerAdminSettingsRoutes(app, auth, config, db)
    registerMetricsRoutes(app, auth, config, db)
  }
  if (auth && tickets) registerTicketRoutes(app, { auth, config, tickets })
  if (auth && catalogs) registerCatalogRoutes(app, { auth, config, catalogs })
}

async function registerExtraRoutes(
  app: FastifyInstance,
  config: AppConfig,
  { auth, evidence, realtime, sync }: OptionalServices,
) {
  if (auth && evidence) {
    registerEvidenceRoutes(app, { auth, config, evidence })
    createTusServer(app, auth, config, evidence)
  }
  if (auth && realtime) {
    registerRealtimeRoutes(app, { auth, config, ...realtime })
    registerNotificationRoutes(app, { auth, config, db: realtime.db })
  }
  if (auth && sync) {
    registerSyncRoutes(app, { auth, config, db: sync.db })
  }
}

async function registerOptionalRoutes(
  app: FastifyInstance,
  config: AppConfig,
  services: OptionalServices,
) {
  await registerCoreRoutes(app, config, services)
  await registerExtraRoutes(app, config, services)
}

export async function buildApp({
  config,
  readiness,
  auth,
  db,
  tickets,
  catalogs,
  evidence,
  realtime,
  sync,
  logger,
}: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: logger ?? buildLogger(config),
    bodyLimit: config.BODY_LIMIT_BYTES,
    trustProxy: config.TRUST_PROXY,
    requestIdHeader: 'x-request-id',
    genReqId: () => randomUUID(),
  })

  app.addHook('onSend', async (request, reply, payload) => {
    reply.header('x-request-id', request.id)
    return payload
  })

  await registerSecurity(app, config.isProduction)
  registerHealthRoutes(app, readiness, config.HEALTH_TIMEOUT_MS)

  await registerOptionalRoutes(app, config, {
    auth,
    db,
    tickets,
    catalogs,
    evidence,
    realtime,
    sync,
  })

  if (config.STATIC_DIR) {
    await registerStatic(app, config.STATIC_DIR)
  }

  registerNotFoundHandler(app, config.STATIC_DIR)
  app.setErrorHandler(errorHandler)

  return app
}
