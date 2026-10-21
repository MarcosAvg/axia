import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { assignTechnician, type AssignTechnicianInput } from './assign.js'
import { createTicket } from './create.js'
import type { CreateTicketInput } from './create-types.js'
import { getTicketDetail } from './detail.js'
import { listParticipants } from './participants.js'
import {
  getTimeline,
  listTickets,
  type ListTicketsOptions,
  type TicketPage,
} from './repository.js'
import { listSupervisors } from './supervisors.js'
import { takeTicket } from './take.js'

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
    take: (actor: Actor, ticketId: string, clientRequestId: string) =>
      takeTicket(db, actor, ticketId, clientRequestId),
    assignTechnician: (actor: Actor, input: AssignTechnicianInput) =>
      assignTechnician(db, actor, input),
  }
}

export type TicketService = ReturnType<typeof createTicketService>
