import { sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import {
  authGuards,
  currentActor,
  requirePermission,
  type Guard,
} from '../auth/guards.js'
import type { AuthService } from '../auth/service.js'
import type { AppConfig } from '../config.js'
import type { Database } from '../db/client.js'
import { scopePredicate } from '../tickets/scope.js'
import type { EventHub } from './hub.js'

const changesQuerySchema = z.object({
  since: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(200).default(100),
})

type ChangeRow = {
  id: string | number
  ticket_id: string
  type: string
  occurred_at: Date | string
}

export type RealtimeRoutesOptions = {
  auth: AuthService
  config: AppConfig
  db: Database
  events: EventHub
}

function registerStream(
  app: FastifyInstance,
  config: AppConfig,
  events: EventHub,
  canView: Guard[],
) {
  app.get('/api/events', { preHandler: canView }, async (request, reply) => {
    reply.hijack()
    reply.raw.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    })
    reply.raw.flushHeaders()
    reply.raw.write('retry: 3000\n\n')

    let closed = false
    const heartbeat = setInterval(() => {
      if (!closed) reply.raw.write(': heartbeat\n\n')
    }, config.SSE_HEARTBEAT_MS)
    const unsubscribe = events.subscribe(
      currentActor(request),
      request.sessionId ?? '',
      (chunk) => {
        if (!closed) reply.raw.write(chunk)
      },
      () => {
        if (!closed) reply.raw.end()
      },
    )
    const cleanup = () => {
      if (closed) return
      closed = true
      clearInterval(heartbeat)
      unsubscribe()
      if (!reply.raw.writableEnded) reply.raw.end()
    }
    request.raw.once('close', cleanup)
    request.raw.once('error', cleanup)
    return reply
  })
}

function registerChanges(app: FastifyInstance, db: Database, canView: Guard[]) {
  app.get('/api/events/changes', { preHandler: canView }, async (request) => {
    const actor = currentActor(request)
    const query = changesQuerySchema.parse(request.query)
    const requesterFilter =
      actor.requesterUserId === null
        ? sql`true`
        : sql`(
            r.user_id is distinct from ${actor.requesterUserId}
            or e.type in (
              select unnest(requester_visible_event_types)
              from public.instance_settings
            )
          )`
    const result = await db.execute(sql`
        select e.id, e.ticket_id, e.type, e.occurred_at
        from public.ticket_events e
        join public.tickets t on t.id = e.ticket_id
        join public.requesters r on r.id = t.requester_id
        where e.id > ${query.since}
          and ${scopePredicate(actor, 'ticket.view')}
          and ${requesterFilter}
        order by e.id
        limit ${query.limit}
      `)
    return {
      items: (result.rows as ChangeRow[]).map((row) => ({
        id: Number(row.id),
        ticketId: row.ticket_id,
        type: row.type,
        occurredAt: new Date(row.occurred_at).toISOString(),
      })),
    }
  })
}

export function registerRealtimeRoutes(
  app: FastifyInstance,
  { auth, config, db, events }: RealtimeRoutesOptions,
) {
  const active = authGuards(auth, config, false)
  const canView: Guard[] = [active, requirePermission('ticket.view')]
  registerStream(app, config, events, canView)
  registerChanges(app, db, canView)
}
