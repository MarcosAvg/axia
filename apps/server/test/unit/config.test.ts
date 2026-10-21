import { describe, expect, it } from 'vitest'

import { loadConfig } from '../../src/config.js'

const base = {
  DATABASE_URL: 'postgres://axia_app:change-me@127.0.0.1:5432/axia',
}

describe('configuration', () => {
  it('applies safe defaults', () => {
    const config = loadConfig(base)

    expect(config.HOST).toBe('0.0.0.0')
    expect(config.PORT).toBe(3000)
    expect(config.LOG_LEVEL).toBe('info')
    expect(config.TRUST_PROXY).toBe(false)
    expect(config.BODY_LIMIT_BYTES).toBe(1_048_576)
    expect(config.HEALTH_TIMEOUT_MS).toBe(2000)
    expect(config.SHUTDOWN_TIMEOUT_MS).toBe(10_000)
    expect(config.SESSION_COOKIE_NAME).toBe('axia_session')
    expect(config.SESSION_ABSOLUTE_TTL_HOURS).toBe(168)
    expect(config.SESSION_IDLE_TTL_HOURS).toBe(24)
    expect(config.LOGIN_MAX_ATTEMPTS).toBe(5)
    expect(config.PASSWORD_MIN_LENGTH).toBe(12)
    expect(config.isProduction).toBe(false)
  })

  it('rejects a missing or non-PostgreSQL database URL without echoing it', () => {
    expect(() => loadConfig({})).toThrow('DATABASE_URL')
    expect(() =>
      loadConfig({ DATABASE_URL: 'mysql://user:sensitive-value@host/db' }),
    ).toThrow('postgres://')
    expect(() =>
      loadConfig({ DATABASE_URL: 'mysql://user:sensitive-value@host/db' }),
    ).not.toThrow('sensitive-value')
  })

  it('accepts explicit values and production mode', () => {
    const config = loadConfig({
      ...base,
      NODE_ENV: 'production',
      PORT: '8080',
      TRUST_PROXY: 'true',
      STATIC_DIR: '/srv/axia/web',
    })

    expect(config.PORT).toBe(8080)
    expect(config.TRUST_PROXY).toBe(true)
    expect(config.STATIC_DIR).toBe('/srv/axia/web')
    expect(config.isProduction).toBe(true)
  })

  it('rejects invalid ports and log levels', () => {
    expect(() => loadConfig({ ...base, PORT: '0' })).toThrow('PORT')
    expect(() => loadConfig({ ...base, LOG_LEVEL: 'verbose' })).toThrow(
      'LOG_LEVEL',
    )
  })
})
