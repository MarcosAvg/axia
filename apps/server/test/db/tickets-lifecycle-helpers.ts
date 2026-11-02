import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'

import { authHeaders, type TicketHttpContext } from './tickets-http-helpers.js'
import type { WriteRefs } from './tickets-write-helpers.js'

export function ticketBody(refs: WriteRefs) {
  return {
    buildingId: refs.buildingId,
    locationId: refs.locationId,
    dependencyId: refs.dependencyId,
    categoryId: refs.categoryId,
    subcategoryId: refs.subcategoryId,
    problemId: refs.problemId,
    serviceTypeId: refs.serviceTypeId,
    priorityId: refs.priorityId,
    channelId: refs.channelId,
    description: 'Tiquet para probar el ciclo de vida',
    requesterId: refs.requesterId,
    clientRequestId: randomUUID(),
  }
}

export async function createTicket(
  context: TicketHttpContext,
  refs: WriteRefs,
) {
  const response = await context.app.inject({
    method: 'POST',
    url: '/api/tickets',
    headers: authHeaders(context.cookies.requester),
    payload: ticketBody(refs),
  })
  if (response.statusCode !== 201) {
    throw new Error(`Ticket creation failed: ${response.statusCode}`)
  }
  return (response.json() as { ticket: { id: string } }).ticket.id
}

export function action(
  context: TicketHttpContext,
  cookie: string,
  ticketId: string,
  payload: Record<string, unknown>,
) {
  return context.app.inject({
    method: 'POST',
    url: `/api/tickets/${ticketId}/actions`,
    headers: authHeaders(cookie),
    payload,
  })
}

export async function takeAndAssign(
  context: TicketHttpContext,
  refs: WriteRefs,
  ticketId: string,
) {
  const take = await action(context, context.cookies.supervisor, ticketId, {
    action: 'take',
    clientRequestId: randomUUID(),
  })
  if (take.statusCode !== 200)
    throw new Error(`Take failed: ${take.statusCode}`)
  const assign = await action(context, context.cookies.supervisor, ticketId, {
    action: 'assign_technician',
    technicianId: refs.technicianId,
    clientRequestId: randomUUID(),
  })
  if (assign.statusCode !== 200) {
    throw new Error(`Assign failed: ${assign.statusCode}`)
  }
}

export async function addEvidence(
  context: TicketHttpContext,
  refs: WriteRefs,
  ticketId: string,
  type: 'before' | 'after',
) {
  await context.db.execute(sql`
    insert into public.evidence (
      ticket_id, cycle, type, captured_by_technician_id, processing_state
    ) values (${ticketId}, 1, ${type}, ${refs.technicianId}, 'ready')
  `)
}

export async function attendedTicket(
  context: TicketHttpContext,
  refs: WriteRefs,
) {
  const ticketId = await createTicket(context, refs)
  await takeAndAssign(context, refs, ticketId)
  await addEvidence(context, refs, ticketId, 'before')
  await action(context, context.cookies.technician, ticketId, {
    action: 'start',
    clientRequestId: randomUUID(),
  })
  await addEvidence(context, refs, ticketId, 'after')
  await action(context, context.cookies.technician, ticketId, {
    action: 'attend',
    workDescription: 'Trabajo terminado',
    clientRequestId: randomUUID(),
  })
  return ticketId
}

export async function closedTicket(
  context: TicketHttpContext,
  refs: WriteRefs,
) {
  const ticketId = await attendedTicket(context, refs)
  await action(context, context.cookies.requester, ticketId, {
    action: 'validate',
    clientRequestId: randomUUID(),
  })
  await action(context, context.cookies.supervisor, ticketId, {
    action: 'validate',
    clientRequestId: randomUUID(),
  })
  return ticketId
}

export async function unlinkedTicket(
  context: TicketHttpContext,
  refs: WriteRefs,
) {
  const requester = await context.db.execute(sql`
    select id from public.requesters
    where full_name = 'Solicitante sin cuenta'
    limit 1
  `)
  const requesterId = (requester.rows[0] as { id: string }).id
  const created = await context.app.inject({
    method: 'POST',
    url: '/api/tickets',
    headers: authHeaders(context.cookies.admin),
    payload: {
      ...ticketBody(refs),
      requesterId,
      clientRequestId: randomUUID(),
    },
  })
  if (created.statusCode !== 201) {
    throw new Error(`Ticket creation failed: ${created.statusCode}`)
  }
  return (created.json() as { ticket: { id: string } }).ticket.id
}
