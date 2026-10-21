import type { FastifyReply, FastifyRequest } from 'fastify'

import type { AppConfig } from '../config.js'

function cookieOptions(config: AppConfig) {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: config.isProduction,
  }
}

export function setSessionCookie(
  reply: FastifyReply,
  token: string,
  config: AppConfig,
) {
  reply.setCookie(config.SESSION_COOKIE_NAME, token, {
    ...cookieOptions(config),
    maxAge: config.SESSION_ABSOLUTE_TTL_HOURS * 3_600,
  })
}

export function clearSessionCookie(reply: FastifyReply, config: AppConfig) {
  reply.setCookie(config.SESSION_COOKIE_NAME, '', {
    ...cookieOptions(config),
    maxAge: 0,
  })
}

export function getSessionToken(
  request: FastifyRequest,
  cookieName: string,
): string | undefined {
  return request.cookies[cookieName]
}
