import { sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import {
  authGuards,
  currentActor,
  requirePermission,
  type Guard,
} from '../auth/guards.js'
import type { Actor } from '../auth/authorization.js'
import type { AuthService } from '../auth/service.js'
import type { AppConfig } from '../config.js'
import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'
import { scopePredicate } from '../tickets/scope.js'

const listQuerySchema = z.object({
  unread: z.enum(['true', 'false']).default('false'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

const idParamsSchema = z.object({ id: z.string().uuid() })

type NotificationRow = {
  id: string
  ticket_id: string | null
  ticket_folio: string | null
  type: string
  payload: unknown
  read_at: Date | string | null
  created_at: Date | string
}

export type NotificationRoutesOptions = {
  auth: AuthService
  config: AppConfig
  db: Database
}

function scope(actor: Actor) {
  return scopePredicate(actor, 'ticket.view')
}

async function listNotifications(
  db: Database,
  actor: Actor,
  query: z.infer<typeof listQuerySchema>,
) {
  const unread = query.unread === 'true'
  const result = await db.execute(sql`
    select n.id, n.ticket_id, t.folio as ticket_folio, n.type, n.payload,
           n.read_at, n.created_at
    from public.notifications n
    left join public.tickets t on t.id = n.ticket_id
    left join public.requesters r on r.id = t.requester_id
    where n.recipient_user_id = ${actor.id}
      and ${unread ? sql`n.read_at is null` : sql`true`}
      and ${scope(actor)}
    order by n.created_at desc, n.id
    limit ${query.limit}
  `)
  return (result.rows as NotificationRow[]).map((row) => ({
    id: row.id,
    ticketId: row.ticket_id,
    ticketFolio: row.ticket_folio,
    type: row.type,
    payload: row.payload,
    readAt: row.read_at === null ? null : new Date(row.read_at).toISOString(),
    createdAt: new Date(row.created_at).toISOString(),
  }))
}

async function unreadCount(db: Database, actor: Actor): Promise<number> {
  const result = await db.execute(sql`
    select count(*)::int as count
    from public.notifications n
    left join public.tickets t on t.id = n.ticket_id
    left join public.requesters r on r.id = t.requester_id
    where n.recipient_user_id = ${actor.id}
      and n.read_at is null
      and ${scope(actor)}
  `)
  return (result.rows[0] as { count: number } | undefined)?.count ?? 0
}

function registerListRoutes(
  app: FastifyInstance,
  db: Database,
  canView: Guard[],
) {
  app.get('/api/notifications', { preHandler: canView }, async (request) => {
    const actor = currentActor(request)
    const query = listQuerySchema.parse(request.query)
    return {
      items: await listNotifications(db, actor, query),
      unread: await unreadCount(db, actor),
    }
  })

  app.get(
    '/api/notifications/unread-count',
    { preHandler: canView },
    async (request) => ({
      count: await unreadCount(db, currentActor(request)),
    }),
  )
}

function registerReadRoutes(
  app: FastifyInstance,
  db: Database,
  canView: Guard[],
) {
  app.post(
    '/api/notifications/:id/read',
    { preHandler: canView },
    async (request, reply) => {
      const { id } = idParamsSchema.parse(request.params)
      const result = await db.execute(sql`
        update public.notifications
        set read_at = now()
        where id = ${id}
          and recipient_user_id = ${currentActor(request).id}
          and read_at is null
      `)
      if (!result.rowCount) {
        throw new AppError(404, 'not_found', 'Notificación no encontrada')
      }
      return reply.status(204).send()
    },
  )

  app.post(
    '/api/notifications/read-all',
    { preHandler: canView },
    async (request) => {
      const result = await db.execute(sql`
        update public.notifications
        set read_at = now()
        where recipient_user_id = ${currentActor(request).id}
          and read_at is null
      `)
      return { updated: result.rowCount ?? 0 }
    },
  )
}

export function registerNotificationRoutes(
  app: FastifyInstance,
  { auth, config, db }: NotificationRoutesOptions,
) {
  const active = authGuards(auth, config, false)
  const canView: Guard[] = [active, requirePermission('ticket.view')]
  registerListRoutes(app, db, canView)
  registerReadRoutes(app, db, canView)
}
