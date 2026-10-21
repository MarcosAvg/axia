import { describe, expect, it } from 'vitest'

import { buildTestApp } from './helpers.js'

describe('security headers', () => {
  it('sets CSP and basic hardening headers', async () => {
    const app = await buildTestApp()
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/health/live',
      })

      expect(response.headers['content-security-policy']).toContain(
        "default-src 'self'",
      )
      expect(response.headers['x-content-type-options']).toBe('nosniff')
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN')
      expect(response.headers['referrer-policy']).toBe('no-referrer')
      expect(response.headers['strict-transport-security']).toBeUndefined()
    } finally {
      await app.close()
    }
  })

  it('honors and returns the request id', async () => {
    const app = await buildTestApp()
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/health/live',
        headers: { 'x-request-id': 'request-123' },
      })

      expect(response.headers['x-request-id']).toBe('request-123')
    } finally {
      await app.close()
    }
  })
})
