import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { getTicketDetail } from './detail.js'
import { listParticipants } from './participants.js'
import {
  getTimeline,
  listTickets,
  type ListTicketsOptions,
} from './repository.js'

export function createTicketService(db: Database) {
  return {
    list: (actor: Actor, options: ListTicketsOptions) =>
      listTickets(db, actor, options),
    detail: (actor: Actor, ticketId: string) =>
      getTicketDetail(db, actor, ticketId),
    timeline: (actor: Actor, ticketId: string) =>
      getTimeline(db, actor, ticketId),
    participants: (actor: Actor, ticketId: string) =>
      listParticipants(db, actor, ticketId),
  }
}

export type TicketService = ReturnType<typeof createTicketService>
