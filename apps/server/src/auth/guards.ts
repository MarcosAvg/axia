import type { FastifyRequest } from 'fastify'

import type { AppConfig } from '../config.js'
import { AppError } from '../http/errors.js'
import { can, type Actor } from './authorization.js'
import { getSessionToken } from './cookies.js'
import type { AuthService } from './service.js'

export type Guard = (request: FastifyRequest) => Promise<void>

export function currentActor(request: FastifyRequest): Actor {
  if (!request.actor) {
    throw new AppError(401, 'unauthorized', 'Inicia sesión para continuar')
  }
  return request.actor
}

async function authenticate(
  request: FastifyRequest,
  auth: AuthService,
  config: AppConfig,
) {
  const token = getSessionToken(request, config.SESSION_COOKIE_NAME)
  if (!token) {
    throw new AppError(401, 'unauthorized', 'Inicia sesión para continuar')
  }

  const result = await auth.authenticate(token)
  if (!result) {
    throw new AppError(401, 'unauthorized', 'La sesión no es válida')
  }

  request.actor = result.actor
  request.sessionId = result.sessionId
}

export function authGuards(
  auth: AuthService,
  config: AppConfig,
  allowPendingPassword: boolean,
): Guard {
  return async (request) => {
    await authenticate(request, auth, config)
    if (!allowPendingPassword && request.actor?.mustChangePassword === true) {
      throw new AppError(
        403,
        'password_change_required',
        'Debes cambiar la contraseña antes de continuar',
      )
    }
  }
}

export function requirePermission(permission: string): Guard {
  return async (request) => {
    if (!can(currentActor(request), permission)) {
      throw new AppError(403, 'forbidden', 'No tienes permiso para esta acción')
    }
  }
}
