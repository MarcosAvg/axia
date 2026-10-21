import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
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

export function createEventHub(db: Database) {
  const subscribers = new Map<string, Subscriber>()
  let visibleTypes: Set<string> | null = null

  async function requesterTypes(): Promise<Set<string>> {
    if (visibleTypes) return visibleTypes
    const result = await db.execute(sql`
      select requester_visible_event_types
      from public.instance_settings
      limit 1
    `)
    const row = result.rows[0] as
      { requester_visible_event_types: string[] | null } | undefined
    visibleTypes = new Set(row?.requester_visible_event_types ?? [])
    return visibleTypes
  }

  async function canReceive(
    actor: Actor,
    event: TicketEvent,
  ): Promise<boolean> {
    const access = await findVisibleTicket(db, actor, event.ticketId)
    if (!access) return false
    if (
      actor.requesterUserId !== null &&
      access.requesterUserId === actor.requesterUserId
    ) {
      return (await requesterTypes()).has(event.type)
    }
    return true
  }

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
      for (const subscriber of subscribers.values()) {
        try {
          if (!(await canReceive(subscriber.actor, event))) continue
          subscriber.write(
            `id: ${event.eventId}\nevent: ticket\ndata: ${JSON.stringify(event)}\n\n`,
          )
        } catch {
          subscriber.close()
          subscribers.delete(subscriber.id)
        }
      }
    },

    size(): number {
      return subscribers.size
    },
  }
}
