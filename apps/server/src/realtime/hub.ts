import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { getPermissionScope } from '../tickets/access.js'
import { findVisibleTicket } from '../tickets/repository.js'

export type TicketEvent = {
  eventId: number
  ticketId: string
  type: string
  occurredAt: string
}

type Subscriber = {
  id: string
  actor: Actor
  write: (chunk: string) => void
  close: () => void
}

export type EventHub = ReturnType<typeof createEventHub>

type VisibleCache = { types: Set<string> | null }

async function requesterTypes(
  db: Database,
  cache: VisibleCache,
): Promise<Set<string>> {
  if (cache.types) return cache.types
  const result = await db.execute(sql`
    select event_type
    from public.instance_settings s
    cross join lateral unnest(s.requester_visible_event_types) as event_type
  `)
  const rows = result.rows as Array<{ event_type: string }>
  cache.types = new Set(rows.map((row) => row.event_type))
  return cache.types
}

async function canReceive(
  db: Database,
  cache: VisibleCache,
  actor: Actor,
  event: TicketEvent,
): Promise<boolean> {
  if (
    actor.requesterUserId === null &&
    getPermissionScope(actor, 'ticket.view') === 'all'
  ) {
    return true
  }
  const access = await findVisibleTicket(db, actor, event.ticketId)
  if (!access) return false
  if (
    actor.requesterUserId !== null &&
    access.requesterUserId === actor.requesterUserId
  ) {
    return (await requesterTypes(db, cache)).has(event.type)
  }
  return true
}

export function createEventHub(db: Database) {
  const subscribers = new Map<string, Subscriber>()
  const cache: VisibleCache = { types: null }

  return {
    subscribe(
      actor: Actor,
      write: (chunk: string) => void,
      close: () => void,
    ): () => void {
      const id = crypto.randomUUID()
      subscribers.set(id, { id, actor, write, close })
      return () => {
        subscribers.delete(id)
      }
    },

    async publish(event: TicketEvent) {
      const byActor = new Map<string, Subscriber[]>()
      for (const subscriber of subscribers.values()) {
        const group = byActor.get(subscriber.actor.id) ?? []
        group.push(subscriber)
        byActor.set(subscriber.actor.id, group)
      }

      const chunk = `id: ${event.eventId}\nevent: ticket\ndata: ${JSON.stringify(event)}\n\n`
      await Promise.all(
        [...byActor.values()].map(async (group) => {
          const actor = group[0]?.actor
          if (!actor) return
          const visible = await canReceive(db, cache, actor, event).catch(
            () => false,
          )
          if (!visible) return
          for (const subscriber of group) {
            try {
              subscriber.write(chunk)
            } catch {
              subscriber.close()
              subscribers.delete(subscriber.id)
            }
          }
        }),
      )
    },

    size(): number {
      return subscribers.size
    },
  }
}
