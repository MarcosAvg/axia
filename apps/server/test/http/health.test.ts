import { describe, expect, it } from 'vitest'

import { buildTestApp } from './helpers.js'

describe('health endpoints', () => {
  it('reports liveness without touching the database', async () => {
    const app = await buildTestApp()
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/health/live',
      })
      expect(response.statusCode).toBe(200)
      expect(response.json()).toEqual({ status: 'ok' })
      expect(response.headers['cache-control']).toBe('no-store')
    } finally {
      await app.close()
    }
  })

  it('reports readiness when the database probe succeeds', async () => {
    const app = await buildTestApp({}, async () => {})
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/health/ready',
      })
      expect(response.statusCode).toBe(200)
      expect(response.json()).toEqual({ status: 'ready' })
    } finally {
      await app.close()
    }
  })

  it('returns 503 without leaking the database error', async () => {
    const app = await buildTestApp({}, async () => {
      throw new Error('connection refused: sensitive-value')
    })
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/health/ready',
      })
      expect(response.statusCode).toBe(503)
      expect(response.json()).toEqual({ status: 'not_ready' })
      expect(response.body).not.toContain('sensitive-value')
    } finally {
      await app.close()
    }
  })

  it('returns 503 when the readiness probe times out', async () => {
    const app = await buildTestApp(
      { HEALTH_TIMEOUT_MS: 100 },
      () => new Promise<void>(() => {}),
    )
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/health/ready',
      })
      expect(response.statusCode).toBe(503)
    } finally {
      await app.close()
    }
  })
})
