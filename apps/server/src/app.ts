import { randomUUID } from 'node:crypto'

import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from 'fastify'

import { registerAuthRoutes } from './auth/routes.js'
import type { AuthService } from './auth/service.js'
import { registerCatalogRoutes } from './catalogs/routes.js'
import type { CatalogService } from './catalogs/service.js'
import { registerEvidenceRoutes } from './evidence/routes.js'
import type { EvidenceService } from './evidence/service.js'
import { createTusServer } from './evidence/tus.js'
import { registerNotificationRoutes } from './realtime/notifications.js'
import { registerRealtimeRoutes } from './realtime/routes.js'
import type { EventHub } from './realtime/hub.js'
import type { Database } from './db/client.js'
import type { AppConfig } from './config.js'
import { errorHandler, registerNotFoundHandler } from './http/errors.js'
import { registerHealthRoutes, type ReadinessProbe } from './http/health.js'
import { registerSecurity } from './http/security.js'
import { registerStatic } from './http/static.js'
import { registerTicketRoutes } from './tickets/routes.js'
import type { TicketService } from './tickets/service.js'

export type BuildAppOptions = {
  config: AppConfig
  readiness: ReadinessProbe
  auth?: AuthService
  tickets?: TicketService
  catalogs?: CatalogService
  evidence?: EvidenceService
  realtime?: { db: Database; events: EventHub }
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
  tickets?: TicketService
  catalogs?: CatalogService
  evidence?: EvidenceService
  realtime?: { db: Database; events: EventHub }
}

async function registerOptionalRoutes(
  app: FastifyInstance,
  config: AppConfig,
  services: OptionalServices,
) {
  const { auth, tickets, catalogs, evidence, realtime } = services
  if (auth) await registerAuthRoutes(app, auth, config)
  if (auth && tickets) registerTicketRoutes(app, { auth, config, tickets })
  if (auth && catalogs) registerCatalogRoutes(app, { auth, config, catalogs })
  if (auth && evidence) {
    registerEvidenceRoutes(app, { auth, config, evidence })
    createTusServer(app, auth, config, evidence)
  }
  if (auth && realtime) {
    registerRealtimeRoutes(app, { auth, config, ...realtime })
    registerNotificationRoutes(app, { auth, config, db: realtime.db })
  }
}

export async function buildApp({
  config,
  readiness,
  auth,
  tickets,
  catalogs,
  evidence,
  realtime,
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
    tickets,
    catalogs,
    evidence,
    realtime,
  })

  if (config.STATIC_DIR) {
    await registerStatic(app, config.STATIC_DIR)
  }

  registerNotFoundHandler(app, config.STATIC_DIR)
  app.setErrorHandler(errorHandler)

  return app
}
