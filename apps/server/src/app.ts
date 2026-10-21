import { randomUUID } from 'node:crypto'

import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from 'fastify'

import type { AppConfig } from './config.js'
import { errorHandler, registerNotFoundHandler } from './http/errors.js'
import { registerHealthRoutes, type ReadinessProbe } from './http/health.js'
import { registerSecurity } from './http/security.js'
import { registerStatic } from './http/static.js'

export type BuildAppOptions = {
  config: AppConfig
  readiness: ReadinessProbe
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

export async function buildApp({
  config,
  readiness,
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

  if (config.STATIC_DIR) {
    await registerStatic(app, config.STATIC_DIR)
  }

  registerNotFoundHandler(app, config.STATIC_DIR)
  app.setErrorHandler(errorHandler)

  return app
}
