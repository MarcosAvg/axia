import type { FastifyInstance } from 'fastify'

import { buildApp } from '../../src/app.js'
import type { AppConfig } from '../../src/config.js'
import type { ReadinessProbe } from '../../src/http/health.js'

const testConfig: AppConfig = {
  NODE_ENV: 'test',
  HOST: '127.0.0.1',
  PORT: 3000,
  DATABASE_URL: 'postgres://axia_app@127.0.0.1:5432/axia',
  LOG_LEVEL: 'silent',
  TRUST_PROXY: false,
  BODY_LIMIT_BYTES: 1_048_576,
  HEALTH_TIMEOUT_MS: 100,
  SHUTDOWN_TIMEOUT_MS: 5_000,
  isProduction: false,
}

export async function buildTestApp(
  overrides: Partial<AppConfig> = {},
  readiness: ReadinessProbe = async () => {},
): Promise<FastifyInstance> {
  return buildApp({
    config: { ...testConfig, ...overrides },
    readiness,
    logger: false,
  })
}
