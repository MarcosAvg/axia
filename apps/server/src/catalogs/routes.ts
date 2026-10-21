import type { FastifyInstance } from 'fastify'

import { authGuards, requirePermission, type Guard } from '../auth/guards.js'
import type { AuthService } from '../auth/service.js'
import type { AppConfig } from '../config.js'
import { AppError } from '../http/errors.js'
import { catalogParamsSchema, catalogQuerySchema } from './schemas.js'
import type { CatalogService } from './service.js'

export type CatalogRoutesOptions = {
  auth: AuthService
  config: AppConfig
  catalogs: CatalogService
}

function requireParent(value: string | undefined, message: string) {
  if (!value) {
    throw new AppError(400, 'validation_error', message)
  }
}

export function registerCatalogRoutes(
  app: FastifyInstance,
  { auth, config, catalogs }: CatalogRoutesOptions,
) {
  const guard: Guard[] = [
    authGuards(auth, config, false),
    requirePermission('ticket.view'),
  ]

  app.get('/api/catalogs/:catalog', { preHandler: guard }, async (request) => {
    const { catalog } = catalogParamsSchema.parse(request.params)
    const query = catalogQuerySchema.parse(request.query)

    if (catalog === 'locations') {
      requireParent(query.buildingId, 'Indica el edificio')
    }
    if (catalog === 'subcategories') {
      requireParent(query.categoryId, 'Indica la categoría')
    }
    if (catalog === 'problems') {
      requireParent(query.subcategoryId, 'Indica la subcategoría')
    }
    if (catalog === 'reasons') {
      requireParent(query.use, 'Indica el uso del motivo')
    }

    return { items: await catalogs.list(catalog, query) }
  })
}
