import { describe, expect, it } from 'vitest'

import { AppError } from '../../src/http/errors.js'
import { buildTestApp } from './helpers.js'

describe('error contract', () => {
  it('serializes AppError and keeps the request id', async () => {
    const app = await buildTestApp()
    app.get('/boom', async () => {
      throw new AppError(409, 'conflict', 'El recurso ya existe', {
        details: { field: 'folio' },
      })
    })

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/boom',
        headers: { 'x-request-id': 'error-123' },
      })

      expect(response.statusCode).toBe(409)
      expect(response.json()).toEqual({
        error: {
          code: 'conflict',
          message: 'El recurso ya existe',
          details: { field: 'folio' },
        },
        requestId: 'error-123',
      })
    } finally {
      await app.close()
    }
  })

  it('hides unexpected error details and returns JSON 404 for the API', async () => {
    const app = await buildTestApp()
    app.get('/explode', async () => {
      throw new Error('database password is sensitive-value')
    })

    try {
      const response = await app.inject({ method: 'GET', url: '/explode' })
      expect(response.statusCode).toBe(500)
      expect(response.json()).toMatchObject({
        error: { code: 'internal_error' },
      })
      expect(response.body).not.toContain('sensitive-value')

      const notFound = await app.inject({ method: 'GET', url: '/api/nope' })
      expect(notFound.statusCode).toBe(404)
      expect(notFound.headers['content-type']).toContain('application/json')
      expect(notFound.json()).toMatchObject({
        error: { code: 'not_found' },
      })
    } finally {
      await app.close()
    }
  })
})
