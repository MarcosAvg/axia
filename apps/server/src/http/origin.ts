import type { FastifyInstance, FastifyRequest } from 'fastify'

import type { AppConfig } from '../config.js'
import { AppError } from './errors.js'

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function firstHeader(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]?.split(',')[0]?.trim()
  return value?.split(',')[0]?.trim()
}

function hasSessionCookie(
  request: FastifyRequest,
  cookieName: string,
): boolean {
  const cookie = request.headers.cookie
  if (!cookie) return false
  return cookie.split(';').some((part) => {
    const [name] = part.trim().split('=')
    return name === cookieName
  })
}

function requestHost(request: FastifyRequest, trustProxy: boolean): string {
  const forwarded = trustProxy
    ? firstHeader(request.headers['x-forwarded-host'])
    : undefined
  return forwarded ?? request.headers.host ?? ''
}

function requestProtocol(request: FastifyRequest): string {
  return request.protocol
}

export function registerOriginGuard(app: FastifyInstance, config: AppConfig) {
  app.addHook('onRequest', async (request) => {
    if (!UNSAFE_METHODS.has(request.method)) return

    const source = request.headers.origin ?? request.headers.referer
    const hasCookie = hasSessionCookie(request, config.SESSION_COOKIE_NAME)

    if (!source) {
      if (hasCookie) {
        throw new AppError(
          403,
          'invalid_origin',
          'Falta el origen de la petición',
        )
      }
      return
    }

    let origin: URL
    try {
      origin = new URL(source)
    } catch {
      throw new AppError(403, 'invalid_origin', 'Origen inválido')
    }

    const expectedHost = requestHost(request, config.TRUST_PROXY)
    let expected: URL
    try {
      expected = new URL(`${requestProtocol(request)}://${expectedHost}`)
    } catch {
      throw new AppError(403, 'invalid_origin', 'Origen inválido')
    }

    if (
      origin.protocol !== expected.protocol ||
      origin.host !== expected.host
    ) {
      throw new AppError(
        403,
        'invalid_origin',
        'El origen de la petición no coincide',
      )
    }
  })
}
