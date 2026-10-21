import type { FastifyInstance } from 'fastify'

import type { AppConfig } from '../config.js'
import {
  authGuards,
  currentActor,
  requirePermission,
  type Guard,
} from '../auth/guards.js'
import type { AuthService } from '../auth/service.js'
import { AppError } from '../http/errors.js'
import { listTicketsQuerySchema, ticketIdParamsSchema } from './schemas.js'
import type { TicketService } from './service.js'

export type TicketRoutesOptions = {
  auth: AuthService
  config: AppConfig
  tickets: TicketService
}

function notFound(): AppError {
  return new AppError(404, 'not_found', 'Tiquet no encontrado')
}

export function registerTicketRoutes(
  app: FastifyInstance,
  { auth, config, tickets }: TicketRoutesOptions,
) {
  const active = authGuards(auth, config, false)
  const canView: Guard[] = [active, requirePermission('ticket.view')]

  app.get('/api/tickets', { preHandler: canView }, async (request) => {
    const query = listTicketsQuerySchema.parse(request.query)
    return tickets.list(currentActor(request), {
      filters: {
        status: query.status,
        statuses: query.statuses,
        buildingId: query.buildingId,
        categoryId: query.categoryId,
        search: query.search || undefined,
      },
      page: query.page,
      pageSize: query.pageSize,
    })
  })

  app.get('/api/tickets/:id', { preHandler: canView }, async (request) => {
    const { id } = ticketIdParamsSchema.parse(request.params)
    const ticket = await tickets.detail(currentActor(request), id)
    if (!ticket) throw notFound()
    return { ticket }
  })

  app.get(
    '/api/tickets/:id/timeline',
    { preHandler: canView },
    async (request) => {
      const { id } = ticketIdParamsSchema.parse(request.params)
      const items = await tickets.timeline(currentActor(request), id)
      if (!items) throw notFound()
      return { items }
    },
  )

  app.get(
    '/api/tickets/:id/participants',
    { preHandler: canView },
    async (request) => {
      const { id } = ticketIdParamsSchema.parse(request.params)
      const items = await tickets.participants(currentActor(request), id)
      if (!items) throw notFound()
      return { items }
    },
  )
}
