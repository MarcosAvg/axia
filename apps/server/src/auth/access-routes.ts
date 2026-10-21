import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import type { Database } from '../db/client.js'
import { authGuards, requirePermission, type Guard } from './guards.js'
import type { AuthService } from './service.js'
import type { AppConfig } from '../config.js'
import { listAccess } from './access-admin.js'
import {
  addScopeBuilding,
  addTechnicianCategory,
  assignUserRole,
  createRole,
  createScope,
  deleteScope,
  linkRequesterUser,
  linkTechnicianUser,
  removeRolePermission,
  removeScopeBuilding,
  removeTechnicianCategory,
  removeUserRole,
  setProfileActive,
  setRolePermission,
  updateRole,
} from './access-admin-write.js'

const idParams = z.object({ id: z.string().uuid() })
const scopeParams = z.object({
  scopeId: z.string().uuid(),
  buildingId: z.string().uuid(),
})
const techCategoryParams = z.object({
  technicianId: z.string().uuid(),
  categoryId: z.string().uuid(),
})

function registerRoleRoutes(
  app: FastifyInstance,
  db: Database,
  guard: Guard[],
) {
  app.post(
    '/api/admin/access/roles',
    { preHandler: guard },
    async (request, reply) => {
      await createRole(
        db,
        z
          .object({
            name: z.string().trim().min(1).max(64),
            label: z.string().trim().min(1).max(120),
          })
          .parse(request.body),
      )
      return reply.status(204).send()
    },
  )

  app.patch(
    '/api/admin/access/roles/:id',
    { preHandler: guard },
    async (request, reply) => {
      const { id } = idParams.parse(request.params)
      await updateRole(
        db,
        id,
        z
          .object({
            label: z.string().trim().min(1).max(120).optional(),
            active: z.boolean().optional(),
          })
          .parse(request.body),
      )
      return reply.status(204).send()
    },
  )
}

function registerRolePermissions(
  app: FastifyInstance,
  db: Database,
  guard: Guard[],
) {
  app.post(
    '/api/admin/access/role-permissions',
    { preHandler: guard },
    async (request, reply) => {
      const body = z
        .object({
          roleId: z.string().uuid(),
          permissionId: z.string().min(1).max(120),
          scope: z.enum(['own', 'team', 'buildings', 'all']),
        })
        .parse(request.body)
      await setRolePermission(db, body.roleId, body.permissionId, body.scope)
      return reply.status(204).send()
    },
  )

  app.post(
    '/api/admin/access/role-permissions/remove',
    { preHandler: guard },
    async (request, reply) => {
      const body = z
        .object({
          roleId: z.string().uuid(),
          permissionId: z.string().min(1).max(120),
        })
        .parse(request.body)
      await removeRolePermission(db, body.roleId, body.permissionId)
      return reply.status(204).send()
    },
  )
}

function registerPeopleRoutes(
  app: FastifyInstance,
  db: Database,
  userGuard: Guard[],
  assignmentGuard: Guard[],
) {
  app.patch(
    '/api/admin/access/profiles/:id',
    { preHandler: userGuard },
    async (request, reply) => {
      const { id } = idParams.parse(request.params)
      const { active } = z.object({ active: z.boolean() }).parse(request.body)
      await setProfileActive(db, id, active)
      return reply.status(204).send()
    },
  )

  app.post(
    '/api/admin/access/user-roles',
    { preHandler: userGuard },
    async (request, reply) => {
      const body = z
        .object({ userId: z.string().uuid(), roleId: z.string().uuid() })
        .parse(request.body)
      await assignUserRole(db, body.userId, body.roleId)
      return reply.status(204).send()
    },
  )

  app.post(
    '/api/admin/access/user-roles/remove',
    { preHandler: userGuard },
    async (request, reply) => {
      const body = z
        .object({ userId: z.string().uuid(), roleId: z.string().uuid() })
        .parse(request.body)
      await removeUserRole(db, body.userId, body.roleId)
      return reply.status(204).send()
    },
  )

  for (const [path, link] of [
    ['requesters', linkRequesterUser],
    ['technicians', linkTechnicianUser],
  ] as const) {
    app.patch(
      `/api/admin/access/${path}/:id`,
      { preHandler: assignmentGuard },
      async (request, reply) => {
        const { id } = idParams.parse(request.params)
        const { userId } = z
          .object({ userId: z.string().uuid().nullable() })
          .parse(request.body)
        await link(db, id, userId)
        return reply.status(204).send()
      },
    )
  }
}

function registerScopeRoutes(
  app: FastifyInstance,
  db: Database,
  guard: Guard[],
) {
  app.post(
    '/api/admin/access/scopes',
    { preHandler: guard },
    async (request, reply) => {
      const body = z
        .object({ userId: z.string().uuid(), teamId: z.string().uuid() })
        .parse(request.body)
      await createScope(db, body.userId, body.teamId)
      return reply.status(204).send()
    },
  )

  app.delete(
    '/api/admin/access/scopes/:id',
    { preHandler: guard },
    async (request, reply) => {
      const { id } = idParams.parse(request.params)
      await deleteScope(db, id)
      return reply.status(204).send()
    },
  )

  app.post(
    '/api/admin/access/scope-buildings',
    { preHandler: guard },
    async (request, reply) => {
      const body = z
        .object({ scopeId: z.string().uuid(), buildingId: z.string().uuid() })
        .parse(request.body)
      await addScopeBuilding(db, body.scopeId, body.buildingId)
      return reply.status(204).send()
    },
  )

  app.delete(
    '/api/admin/access/scope-buildings/:scopeId/:buildingId',
    { preHandler: guard },
    async (request, reply) => {
      const params = scopeParams.parse(request.params)
      await removeScopeBuilding(db, params.scopeId, params.buildingId)
      return reply.status(204).send()
    },
  )
}

function registerTechnicianCategories(
  app: FastifyInstance,
  db: Database,
  guard: Guard[],
) {
  app.post(
    '/api/admin/access/technician-categories',
    { preHandler: guard },
    async (request, reply) => {
      const body = z
        .object({
          technicianId: z.string().uuid(),
          categoryId: z.string().uuid(),
        })
        .parse(request.body)
      await addTechnicianCategory(db, body.technicianId, body.categoryId)
      return reply.status(204).send()
    },
  )

  app.delete(
    '/api/admin/access/technician-categories/:technicianId/:categoryId',
    { preHandler: guard },
    async (request, reply) => {
      const params = techCategoryParams.parse(request.params)
      await removeTechnicianCategory(db, params.technicianId, params.categoryId)
      return reply.status(204).send()
    },
  )
}

export function registerAdminAccessRoutes(
  app: FastifyInstance,
  auth: AuthService,
  config: AppConfig,
  db: Database,
) {
  const active = authGuards(auth, config, false)
  const userGuard: Guard[] = [active, requirePermission('user.manage')]
  const roleGuard: Guard[] = [active, requirePermission('role.manage')]
  const assignmentGuard: Guard[] = [
    active,
    requirePermission('assignment.manage'),
  ]

  app.get('/api/admin/access', { preHandler: userGuard }, async () =>
    listAccess(db),
  )
  registerRoleRoutes(app, db, roleGuard)
  registerRolePermissions(app, db, roleGuard)
  registerPeopleRoutes(app, db, userGuard, assignmentGuard)
  registerScopeRoutes(app, db, assignmentGuard)
  registerTechnicianCategories(app, db, assignmentGuard)
}
