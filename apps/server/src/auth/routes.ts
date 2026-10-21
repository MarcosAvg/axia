import cookie from '@fastify/cookie'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import type { AppConfig } from '../config.js'
import { AppError } from '../http/errors.js'
import { registerOriginGuard } from '../http/origin.js'
import type { Actor } from './authorization.js'
import { can } from './authorization.js'
import {
  clearSessionCookie,
  getSessionToken,
  setSessionCookie,
} from './cookies.js'
import {
  changePasswordSchema,
  createUserSchema,
  listUsersQuerySchema,
  loginSchema,
  setupSchema,
  updateUserSchema,
} from './schemas.js'
import type { AuthService } from './service.js'
import type { SessionContext } from './sessions.js'

const idParamsSchema = z.object({ id: z.string().uuid() })

type Guard = (request: FastifyRequest) => Promise<void>

function sessionContext(request: FastifyRequest): SessionContext {
  return {
    ip: request.ip,
    userAgent: request.headers['user-agent'] ?? null,
  }
}

function actorResponse(actor: Actor) {
  return {
    id: actor.id,
    username: actor.username,
    fullName: actor.fullName,
    mustChangePassword: actor.mustChangePassword,
    roles: actor.roles,
    permissions: actor.permissions,
  }
}

function currentActor(request: FastifyRequest): Actor {
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

function authGuards(
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

function requirePermission(permission: string): Guard {
  return async (request) => {
    if (!can(currentActor(request), permission)) {
      throw new AppError(403, 'forbidden', 'No tienes permiso para esta acción')
    }
  }
}

async function setLoginResponse(
  reply: FastifyReply,
  result: { actor: Actor; token: string },
  config: AppConfig,
  statusCode = 200,
) {
  setSessionCookie(reply, result.token, config)
  return reply.status(statusCode).send({
    user: actorResponse(result.actor),
    mustChangePassword: result.actor.mustChangePassword,
  })
}

async function registerSetupRoutes(
  app: FastifyInstance,
  auth: AuthService,
  config: AppConfig,
) {
  app.get('/api/setup/status', async () => auth.setupStatus())

  app.post('/api/setup', async (request, reply) => {
    const body = setupSchema(config.PASSWORD_MIN_LENGTH).parse(request.body)
    const result = await auth.setup(body, sessionContext(request))
    return setLoginResponse(reply, result, config, 201)
  })
}

async function registerSessionRoutes(
  app: FastifyInstance,
  auth: AuthService,
  config: AppConfig,
  allowPending: Guard,
) {
  app.post('/api/auth/login', async (request, reply) => {
    const body = loginSchema.parse(request.body)
    const result = await auth.login(body, sessionContext(request))
    return setLoginResponse(reply, result, config)
  })

  app.post(
    '/api/auth/logout',
    { preHandler: allowPending },
    async (request, reply) => {
      if (request.sessionId) await auth.logout(request.sessionId)
      clearSessionCookie(reply, config)
      return reply.status(204).send()
    },
  )

  app.get('/api/auth/me', { preHandler: allowPending }, async (request) => ({
    user: actorResponse(currentActor(request)),
  }))

  app.post(
    '/api/auth/change-password',
    { preHandler: allowPending },
    async (request, reply) => {
      const body = changePasswordSchema(config.PASSWORD_MIN_LENGTH).parse(
        request.body,
      )
      const result = await auth.changePassword(
        currentActor(request),
        body,
        sessionContext(request),
      )
      return setLoginResponse(reply, result, config)
    },
  )
}

async function registerAdminUserRoutes(
  app: FastifyInstance,
  auth: AuthService,
  admin: Guard[],
) {
  app.get('/api/admin/users', { preHandler: admin }, async (request) => {
    const query = listUsersQuerySchema.parse(request.query)
    const active =
      query.active === 'true'
        ? true
        : query.active === 'false'
          ? false
          : undefined
    return auth.listUsers({
      search: query.search,
      active,
      page: query.page,
      pageSize: query.pageSize,
    })
  })

  app.post(
    '/api/admin/users',
    { preHandler: admin },
    async (request, reply) => {
      const body = createUserSchema.parse(request.body)
      const result = await auth.createUser(body)
      return reply.status(201).send(result)
    },
  )

  app.patch('/api/admin/users/:id', { preHandler: admin }, async (request) => {
    const { id } = idParamsSchema.parse(request.params)
    const body = updateUserSchema.parse(request.body)
    return {
      user: await auth.updateUser(currentActor(request), id, body),
    }
  })
}

async function registerAdminAccountRoutes(
  app: FastifyInstance,
  auth: AuthService,
  admin: Guard[],
) {
  app.get('/api/admin/roles', { preHandler: admin }, async () => ({
    items: await auth.listRoles(),
  }))

  app.post(
    '/api/admin/users/:id/reset-password',
    { preHandler: admin },
    async (request) => {
      const { id } = idParamsSchema.parse(request.params)
      return auth.resetPassword(currentActor(request), id)
    },
  )

  app.post(
    '/api/admin/users/:id/revoke-sessions',
    { preHandler: admin },
    async (request) => {
      const { id } = idParamsSchema.parse(request.params)
      await auth.revokeSessionsForUser(id)
      return { ok: true }
    },
  )
}

export async function registerAuthRoutes(
  app: FastifyInstance,
  auth: AuthService,
  config: AppConfig,
) {
  await app.register(cookie)
  registerOriginGuard(app, config)

  const allowPending = authGuards(auth, config, true)
  const requireActivePassword = authGuards(auth, config, false)
  const admin: Guard[] = [
    requireActivePassword,
    requirePermission('user.manage'),
  ]

  await registerSetupRoutes(app, auth, config)
  await registerSessionRoutes(app, auth, config, allowPending)
  await registerAdminUserRoutes(app, auth, admin)
  await registerAdminAccountRoutes(app, auth, admin)
}
