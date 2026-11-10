import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { currentActor, type Guard } from '../auth/guards.js'
import { eventTimeSchema } from './action-time.js'
import type { TicketService } from './service.js'

const paramsSchema = z.object({
  id: z.string().uuid(),
  eventId: z.coerce.number().int().positive(),
})

export function registerEventTimeRoute(
  app: FastifyInstance,
  tickets: TicketService,
  canView: Guard[],
) {
  app.patch(
    '/api/tickets/:id/events/:eventId/time',
    { preHandler: canView },
    async (request, reply) => {
      const { id, eventId } = paramsSchema.parse(request.params)
      const body = eventTimeSchema.parse(request.body)
      await tickets.adjustEventTime(currentActor(request), {
        ticketId: id,
        eventId,
        occurredLocal: body.occurredLocal,
        occurredAt: body.occurredAt,
      })
      return reply.status(204).send()
    },
  )
}
