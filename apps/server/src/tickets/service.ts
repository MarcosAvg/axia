import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { runTicketAction } from './actions.js'
import { createTicket } from './create.js'
import type { CreateTicketInput } from './create-types.js'
import { adjustEventTime } from './action-time.js'
import { getTicketDetail } from './detail.js'
import { listParticipants } from './participants.js'
import { getPauseState, getPauseSteps } from './pause-read.js'
import { getRating } from './rating-read.js'
import { checkDuplicateCandidates } from './duplicates.js'
import {
  getTimeline,
  listTickets,
  type ListTicketsOptions,
  type TicketPage,
} from './repository.js'
import type { TicketActionInput } from './schemas.js'
import { listSupervisors } from './supervisors.js'

function emptyPage(page: number, pageSize: number): TicketPage {
  return { items: [], total: 0, page, pageSize }
}

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
    pauseSteps: (actor: Actor, ticketId: string) =>
      getPauseSteps(db, actor, ticketId),
    pauseState: (actor: Actor, ticketId: string) =>
      getPauseState(db, actor, ticketId),
    rating: (actor: Actor, ticketId: string) => getRating(db, actor, ticketId),
    adjustEventTime: (
      actor: Actor,
      ticketId: string,
      eventId: number,
      occurredAt: string,
    ) => adjustEventTime(db, actor, { ticketId, eventId, occurredAt }),
    duplicateCandidates: (
      actor: Actor,
      input: {
        buildingId: string
        categoryId: string
        problemId?: string | null
        description: string
      },
    ) => checkDuplicateCandidates(db, actor, input),
    myWork: (actor: Actor, page: number, pageSize: number) => {
      if (!actor.technicianId) return emptyPage(page, pageSize)
      return listTickets(db, actor, {
        filters: {
          assigneeTechnicianId: actor.technicianId,
          excludeFinal: true,
        },
        page,
        pageSize,
      })
    },
    offers: (actor: Actor, page: number, pageSize: number) =>
      listTickets(db, actor, {
        filters: { offerSupervisorUserId: actor.id },
        page,
        pageSize,
      }),
    supervisors: (actor: Actor) => listSupervisors(db, actor),
    create: (actor: Actor, input: CreateTicketInput) =>
      createTicket(db, actor, input),
    action: (actor: Actor, ticketId: string, input: TicketActionInput) =>
      runTicketAction(db, actor, ticketId, input),
  }
}

export type TicketService = ReturnType<typeof createTicketService>
