import type { DemoTicket } from './data.js'
import { insertDemoOffers, repairDemoOffers } from './flow.js'
import { resolveTicketIds, ticketTimes } from './ticket-data.js'
import { insertAssignments, insertParticipants } from './ticket-roster.js'
import {
  insertCaptures,
  insertClaims,
  insertDuplicateLinks,
  insertPauses,
  insertRatings,
  insertValidations,
} from './ticket-extras.js'
import { insertEvents } from './ticket-event-store.js'
import {
  stageFor,
  type TicketContext,
  type TicketSeedInput,
} from './ticket-internal.js'

type IdRow = { id: string }

const DISCARDED = ['rejected', 'cancelled', 'duplicate']

function closedAtFor(context: TicketContext) {
  const { ticket, times } = context
  if (ticket.status === 'closed') {
    return times.reopen?.validated ?? times.validated
  }
  if (DISCARDED.includes(ticket.status)) return times.discardAt ?? null
  return null
}

function previousStatus(ticket: DemoTicket) {
  return DISCARDED.includes(ticket.status)
    ? (ticket.discardedFrom ?? 'registered')
    : null
}

function possibleDuplicate(ticket: DemoTicket) {
  if (ticket.duplicateOf || !ticket.duplicateCandidateOf) return false
  return ticket.duplicateCandidateDecision === null
}

async function insertTicketRow(context: TicketContext) {
  const { client, ticket, ids, people, times, cycle } = context
  const result = await client.query<IdRow>(
    `insert into public.tickets (
       id, status, cycle, team_id, building_id, location_id, dependency_id,
       category_id, subcategory_id, problem_id, service_type_id, priority_id,
       channel_id, description, requester_id, requester_name,
       requester_contact, registered_by, reported_at, closed_at,
       possible_duplicate, duplicate_of_id, status_before_discard
     ) values (
       $1, $2::public.ticket_status, $3, $4, $5, $6, $7, $8, $9, $10,
       (select id from public.service_types where name = $11),
       (select id from public.priorities where name = $12),
       (select id from public.channels where name = $13),
       $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
     )
     on conflict (id) do nothing
     returning id`,
    [
      ticket.id,
      ticket.status,
      cycle,
      ids.teamId,
      ids.buildingId,
      ids.locationId,
      ids.dependencyId,
      ids.categoryId,
      ids.subcategoryId,
      ids.problemId,
      ticket.serviceType,
      ticket.priority,
      ticket.channel,
      ticket.description,
      ids.requesterId,
      ids.requesterName,
      ids.requesterContact,
      people.supervisorId,
      times.reportedAt,
      closedAtFor(context),
      possibleDuplicate(ticket),
      ticket.duplicateOf ?? null,
      previousStatus(ticket),
    ],
  )
  return result.rowCount === 1
}

async function insertOffers(context: TicketContext) {
  const { client, ticket, people, times, stage } = context
  await insertDemoOffers(client, ticket.id, {
    ...times,
    stage,
    supervisorId: people.supervisorId,
    terminalAt: DISCARDED.includes(ticket.status) ? times.discardAt : undefined,
    cycle: 1,
  })
}

async function rebuildSpans(context: TicketContext) {
  await context.client.query('select public.rebuild_ticket_time_spans($1)', [
    context.ticket.id,
  ])
}

export async function insertDemoTicket(input: TicketSeedInput) {
  const { client, ticket, catalogs, people, reasons, storage } = input
  const context: TicketContext = {
    client,
    ticket,
    people,
    reasons,
    storage,
    ids: resolveTicketIds(ticket, catalogs, people),
    times: ticketTimes(ticket),
    stage: stageFor(ticket),
    cycle: ticket.reopen ? 2 : 1,
  }
  if (!(await insertTicketRow(context))) {
    await repairDemoOffers(client, ticket)
    return false
  }
  await insertOffers(context)
  await insertAssignments(context)
  await insertParticipants(context)
  await insertPauses(context)
  await insertClaims(context)
  await insertCaptures(context)
  await insertDuplicateLinks(context)
  await insertRatings(context)
  await insertValidations(context)
  await insertEvents(context)
  await rebuildSpans(context)
  return true
}
