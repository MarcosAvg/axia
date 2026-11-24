import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import type { Database } from '../db/client.js'
import {
  addScopeBuilding,
  addTechnicianCategory,
  deleteScope,
  removeScopeBuilding,
  removeTechnicianCategory,
} from './access-admin-write.js'
import {
  createScope,
  setScopeBuildings,
  setTechnicianCategories,
} from './access-assignments.js'
import type { Guard } from './guards.js'

const assignmentIds = z.array(z.string().uuid())
const idParams = z.object({ id: z.string().uuid() })
const scopeParams = z.object({
  scopeId: z.string().uuid(),
  buildingId: z.string().uuid(),
})
const techCategoryParams = z.object({
  technicianId: z.string().uuid(),
  categoryId: z.string().uuid(),
})

function registerScopeBuildings(
  app: FastifyInstance,
  db: Database,
  guard: Guard[],
) {
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

export function registerScopeRoutes(
  app: FastifyInstance,
  db: Database,
  guard: Guard[],
) {
  app.post(
    '/api/admin/access/scopes',
    { preHandler: guard },
    async (request, reply) => {
      const body = z
        .object({
          userId: z.string().uuid(),
          teamId: z.string().uuid(),
          buildingIds: assignmentIds.optional(),
        })
        .parse(request.body)
      await createScope(db, body)
      return reply.status(204).send()
    },
  )

  app.patch(
    '/api/admin/access/scopes/:id',
    { preHandler: guard },
    async (request, reply) => {
      const { id } = idParams.parse(request.params)
      const { buildingIds } = z
        .object({ buildingIds: assignmentIds })
        .parse(request.body)
      await setScopeBuildings(db, id, buildingIds)
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
  registerScopeBuildings(app, db, guard)
}

export function registerTechnicianCategories(
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

  app.patch(
    '/api/admin/access/technician-categories/:id',
    { preHandler: guard },
    async (request, reply) => {
      const { id } = idParams.parse(request.params)
      const { categoryIds } = z
        .object({ categoryIds: assignmentIds })
        .parse(request.body)
      await setTechnicianCategories(db, id, categoryIds)
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
