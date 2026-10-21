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
import {
  createTicketSchema,
  listTicketsQuerySchema,
  paginationQuerySchema,
  ticketActionSchema,
  ticketIdParamsSchema,
} from './schemas.js'
import type { TicketService } from './service.js'

export type TicketRoutesOptions = {
  auth: AuthService
  config: AppConfig
  tickets: TicketService
}

type TicketGuards = {
  active: Guard
  canView: Guard[]
  canTakeOffer: Guard[]
  canAssignSupervisor: Guard[]
}

function notFound(): AppError {
  return new AppError(404, 'not_found', 'Tiquet no encontrado')
}

function createGuards(auth: AuthService, config: AppConfig): TicketGuards {
  const active = authGuards(auth, config, false)
  return {
    active,
    canView: [active, requirePermission('ticket.view')],
    canTakeOffer: [
      active,
      requirePermission('ticket.take_offer'),
      requirePermission('ticket.view'),
    ],
    canAssignSupervisor: [
      active,
      requirePermission('ticket.assign_supervisor'),
    ],
  }
}

function registerListRoute(
  app: FastifyInstance,
  tickets: TicketService,
  canView: Guard[],
) {
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
}

function registerWorklistRoutes(
  app: FastifyInstance,
  tickets: TicketService,
  guards: TicketGuards,
) {
  app.get(
    '/api/tickets/mine',
    { preHandler: guards.canView },
    async (request) => {
      const query = paginationQuerySchema.parse(request.query)
      return tickets.myWork(currentActor(request), query.page, query.pageSize)
    },
  )

  app.get(
    '/api/tickets/offers',
    { preHandler: guards.canTakeOffer },
    async (request) => {
      const query = paginationQuerySchema.parse(request.query)
      return tickets.offers(currentActor(request), query.page, query.pageSize)
    },
  )

  app.get(
    '/api/supervisors',
    { preHandler: guards.canAssignSupervisor },
    async (request) => ({
      items: await tickets.supervisors(currentActor(request)),
    }),
  )
}

function registerWriteRoutes(
  app: FastifyInstance,
  tickets: TicketService,
  guards: TicketGuards,
) {
  app.post(
    '/api/tickets',
    { preHandler: guards.active },
    async (request, reply) => {
      const input = createTicketSchema.parse(request.body)
      const result = await tickets.create(currentActor(request), input)
      return reply.status(result.replayed ? 200 : 201).send({
        ticket: {
          id: result.ticketId,
          folio: result.folio,
          possibleDuplicate: result.possibleDuplicate,
        },
        replayed: result.replayed,
      })
    },
  )

  app.post(
    '/api/tickets/:id/actions',
    { preHandler: guards.canView },
    async (request) => {
      const { id } = ticketIdParamsSchema.parse(request.params)
      const body = ticketActionSchema.parse(request.body)
      const actor = currentActor(request)
      if (body.action === 'take') {
        return tickets.take(actor, id, body.clientRequestId)
      }
      return tickets.assignTechnician(actor, {
        ticketId: id,
        technicianId: body.technicianId,
        reasonId: body.reasonId ?? null,
        clientRequestId: body.clientRequestId,
      })
    },
  )
}

function registerDetailRoutes(
  app: FastifyInstance,
  tickets: TicketService,
  canView: Guard[],
) {
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

export function registerTicketRoutes(
  app: FastifyInstance,
  { auth, config, tickets }: TicketRoutesOptions,
) {
  const guards = createGuards(auth, config)
  registerListRoute(app, tickets, guards.canView)
  registerWorklistRoutes(app, tickets, guards)
  registerWriteRoutes(app, tickets, guards)
  registerDetailRoutes(app, tickets, guards.canView)
}
