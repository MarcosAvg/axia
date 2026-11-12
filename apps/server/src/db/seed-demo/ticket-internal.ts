import type { Client } from 'pg'

import type { DemoCatalogs } from './catalogs.js'
import { STAGE, type DemoTicket } from './data.js'
import type { DemoEvidenceStorage } from './evidence.js'
import type { DemoPeople } from './people.js'
import type { DemoReasons } from './reasons.js'
import type { ResolvedTicket, TicketTimes } from './ticket-data.js'

export type TicketContext = {
  client: Client
  ticket: DemoTicket
  ids: ResolvedTicket
  people: DemoPeople
  times: TicketTimes
  stage: number
  cycle: number
  reasons: DemoReasons
  storage: DemoEvidenceStorage
}

export type DemoEvent = {
  type: string
  at: Date
  actorId: string
  technicianId?: string
  subjectUserId?: string
  subjectRequesterId?: string
  reasonId?: string
  payload?: Record<string, unknown>
  cycle?: number
  order: number
}

export type EventDraft = Omit<DemoEvent, 'order'>

export function stageFor(ticket: DemoTicket) {
  if (
    ticket.status === 'rejected' ||
    ticket.status === 'cancelled' ||
    ticket.status === 'duplicate'
  ) {
    return STAGE[ticket.discardedFrom ?? 'registered']
  }
  return STAGE[ticket.status]
}

export function atHours(base: Date, hours: number) {
  return new Date(base.getTime() + hours * 60 * 60 * 1000)
}

export function finalAt(context: TicketContext) {
  const { ticket, times, cycle } = context
  if (ticket.reopen) {
    return cycle === 1
      ? times.validated
      : (times.reopen?.validated ?? times.validated)
  }
  if (ticket.status === 'closed') return times.validated
  if (ticket.status === 'under_claim') return times.claimAt
  if (
    ticket.status === 'rejected' ||
    ticket.status === 'cancelled' ||
    ticket.status === 'duplicate'
  ) {
    return times.discardAt
  }
  return undefined
}

export function reassignedAt(context: TicketContext, afterHours: number) {
  const candidate = atHours(context.times.reportedAt, afterHours)
  const beforeStart = new Date(context.times.started.getTime() - 5 * 60 * 1000)
  return candidate < beforeStart ? candidate : beforeStart
}

export function activeTechnicianId(context: TicketContext) {
  const reassigned = context.ticket.reassignment
  return reassigned
    ? context.people.technicians[reassigned.technician]
    : context.ids.technicianId
}

export type TicketSeedInput = {
  client: Client
  ticket: DemoTicket
  catalogs: DemoCatalogs
  people: DemoPeople
  reasons: DemoReasons
  storage: DemoEvidenceStorage
}
