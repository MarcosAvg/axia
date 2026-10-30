import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import type { AppConfig } from '../config.js'
import type { Database } from '../db/client.js'
import { authGuards, requirePermission, type Guard } from '../auth/guards.js'
import type { AuthService } from '../auth/service.js'
import {
  adminTable,
  insertAdminRow,
  listAdminRows,
  listDependencyLocationIds,
  listDependencyLocations,
  replaceDependencyLocations,
  updateAdminRow,
  type AdminValues,
} from './admin.js'

const tableParams = z.object({ table: z.string().min(1).max(40) })
const rowParams = tableParams.extend({ id: z.string().uuid() })
const dependencyParams = z.object({ id: z.string().uuid() })
const locationIdsBody = z.object({
  locationIds: z.array(z.string().uuid()).max(500),
})
const bodySchema = z.record(
  z.string().min(1).max(64),
  z.union([z.string(), z.number(), z.boolean(), z.null()]),
)

function valuesOf(body: Record<string, unknown>): AdminValues {
  return body as AdminValues
}

function registerDependencyLocationRoutes(
  app: FastifyInstance,
  guard: Guard[],
  db: Database,
) {
  app.get(
    '/api/admin/catalogs/dependencies/locations',
    { preHandler: guard },
    async () => ({ items: await listDependencyLocations(db) }),
  )

  app.get(
    '/api/admin/catalogs/dependencies/:id/locations',
    { preHandler: guard },
    async (request) => {
      const { id } = dependencyParams.parse(request.params)
      return { locationIds: await listDependencyLocationIds(db, id) }
    },
  )

  app.put(
    '/api/admin/catalogs/dependencies/:id/locations',
    { preHandler: guard },
    async (request, reply) => {
      const { id } = dependencyParams.parse(request.params)
      const { locationIds } = locationIdsBody.parse(request.body)
      await replaceDependencyLocations(db, id, locationIds)
      return reply.status(204).send()
    },
  )
}

export function registerAdminCatalogRoutes(
  app: FastifyInstance,
  auth: AuthService,
  config: AppConfig,
  db: Database,
) {
  const guard: Guard[] = [
    authGuards(auth, config, false),
    requirePermission('catalog.manage'),
  ]

  app.get(
    '/api/admin/catalogs/:table',
    { preHandler: guard },
    async (request) => {
      const { table } = tableParams.parse(request.params)
      const query = z
        .object({ orderBy: z.string().min(1).max(64).default('name') })
        .parse(request.query)
      return {
        items: await listAdminRows(db, adminTable(table), query.orderBy),
      }
    },
  )

  registerDependencyLocationRoutes(app, guard, db)

  app.post(
    '/api/admin/catalogs/:table',
    { preHandler: guard },
    async (request, reply) => {
      const { table } = tableParams.parse(request.params)
      const id = await insertAdminRow(
        db,
        adminTable(table),
        valuesOf(bodySchema.parse(request.body)),
      )
      return reply.status(201).send({ id })
    },
  )

  app.patch(
    '/api/admin/catalogs/:table/:id',
    { preHandler: guard },
    async (request, reply) => {
      const params = rowParams.parse(request.params)
      await updateAdminRow(
        db,
        adminTable(params.table),
        params.id,
        valuesOf(bodySchema.parse(request.body)),
      )
      return reply.status(204).send()
    },
  )
}
