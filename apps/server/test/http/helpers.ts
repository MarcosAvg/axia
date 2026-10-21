import type { FastifyInstance } from 'fastify'

import { buildApp } from '../../src/app.js'
import type { AppConfig } from '../../src/config.js'
import type { ReadinessProbe } from '../../src/http/health.js'

export const testConfig: AppConfig = {
  NODE_ENV: 'test',
  HOST: '127.0.0.1',
  PORT: 3000,
  DATABASE_URL: 'postgres://axia_app@127.0.0.1:5432/axia',
  LOG_LEVEL: 'silent',
  TRUST_PROXY: false,
  BODY_LIMIT_BYTES: 1_048_576,
  STORAGE_DIR: './data/evidence-test',
  EVIDENCE_MAX_BYTES: 20 * 1024 * 1024,
  EVIDENCE_MAX_DIMENSION: 4096,
  EVIDENCE_THUMBNAIL_SIZE: 320,
  EVIDENCE_QUOTA_BYTES: 500 * 1024 * 1024,
  SSE_HEARTBEAT_MS: 15_000,
  SYNC_FUTURE_TOLERANCE_MS: 5 * 60 * 1000,
  SYNC_MAX_AGE_MS: 30 * 24 * 60 * 60 * 1000,
  HEALTH_TIMEOUT_MS: 100,
  SHUTDOWN_TIMEOUT_MS: 5_000,
  SESSION_COOKIE_NAME: 'axia_session',
  SESSION_ABSOLUTE_TTL_HOURS: 24 * 7,
  SESSION_IDLE_TTL_HOURS: 24,
  SESSION_TOUCH_INTERVAL_SECONDS: 60,
  LOGIN_MAX_ATTEMPTS: 5,
  LOGIN_MAX_IP_ATTEMPTS: 20,
  LOGIN_WINDOW_MINUTES: 15,
  PASSWORD_MIN_LENGTH: 12,
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
