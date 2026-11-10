import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it } from 'vitest'

import {
  action,
  attendedTicket,
  closedTicket,
  createTicket,
  takeAndAssign,
} from './tickets-lifecycle-helpers.js'
import {
  authHeaders,
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'
import { childReasonId, reasonId } from './time-links-helpers.js'
import { loadWriteRefs, type WriteRefs } from './tickets-write-helpers.js'

let context: TicketHttpContext
let refs: WriteRefs

beforeAll(async () => {
  context = await buildTicketHttpApp()
  refs = await loadWriteRefs(context)
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

type EventRow = { id: string; occurred_at: Date | string }

async function eventRow(ticketId: string, type: string): Promise<EventRow> {
  const result = await context.db.execute(sql`
    select id, occurred_at from public.ticket_events
    where ticket_id = ${ticketId} and type = ${type}
    order by occurred_at desc, id desc
    limit 1
  `)
  return result.rows[0] as EventRow
}

async function adjust(ticketId: string, eventId: string, occurredAt: string) {
  return context.app.inject({
    method: 'PATCH',
    url: `/api/tickets/${ticketId}/events/${eventId}/time`,
    headers: authHeaders(context.cookies.admin),
    payload: { occurredAt },
  })
}

function iso(value: Date | string): string {
  return new Date(value).toISOString()
}

async function startedTicket(): Promise<string> {
  const ticketId = await createTicket(context, refs)
  await takeAndAssign(context, refs, ticketId)
  await context.db.execute(sql`
    insert into public.evidence (
      ticket_id, cycle, type, captured_by_technician_id, processing_state
    ) values (${ticketId}, 1, 'before', ${refs.technicianId}, 'ready')
  `)
  await action(context, context.cookies.technician, ticketId, {
    action: 'start',
    clientRequestId: randomUUID(),
  })
  return ticketId
}

it('mueve la pausa, sus pasos y la reanudación con sus eventos', async () => {
  const ticketId = await startedTicket()
  const paused = await action(context, context.cookies.technician, ticketId, {
    action: 'pause',
    reasonId: refs.pauseReasonId,
    clientRequestId: randomUUID(),
  })
  expect(paused.statusCode).toBe(200)

  const pausedEvent = await eventRow(ticketId, 'paused')
  const pausedAt = new Date().toISOString()
  expect(await adjust(ticketId, pausedEvent.id, pausedAt)).toMatchObject({
    statusCode: 204,
  })

  const pause = await context.db.execute(sql`
    select id, opened_at from public.ticket_pauses
    where ticket_id = ${ticketId}
    order by opened_at desc limit 1
  `)
  const pauseRow = pause.rows[0] as { id: string; opened_at: Date | string }
  expect(iso(pauseRow.opened_at)).toBe(pausedAt)
  const step = await context.db.execute(sql`
    select entered_at from public.ticket_pause_steps
    where pause_id = ${pauseRow.id}
  `)
  expect(iso((step.rows[0] as { entered_at: Date | string }).entered_at)).toBe(
    pausedAt,
  )

  const childId = await childReasonId(context, refs.pauseReasonId)
  const resumed = await action(context, context.cookies.technician, ticketId, {
    action: 'resume',
    reasonId: childId,
    clientRequestId: randomUUID(),
  })
  expect(resumed.statusCode).toBe(200)
  const resumedEvent = await eventRow(ticketId, 'resumed')
  const resumedAt = new Date().toISOString()
  expect(await adjust(ticketId, resumedEvent.id, resumedAt)).toMatchObject({
    statusCode: 204,
  })

  const closed = await context.db.execute(sql`
    select closed_at from public.ticket_pauses where id = ${pauseRow.id}
  `)
  expect(iso((closed.rows[0] as { closed_at: Date | string }).closed_at)).toBe(
    resumedAt,
  )
  const exited = await context.db.execute(sql`
    select exited_at from public.ticket_pause_steps
    where pause_id = ${pauseRow.id} and exited_at is not null
  `)
  expect(iso((exited.rows[0] as { exited_at: Date | string }).exited_at)).toBe(
    resumedAt,
  )
})

it('mueve la oferta y la asignación de supervisor al ajustar la toma', async () => {
  const ticketId = await createTicket(context, refs)
  const taken = await action(context, context.cookies.supervisor, ticketId, {
    action: 'take',
    clientRequestId: randomUUID(),
  })
  expect(taken.statusCode).toBe(200)

  const event = await eventRow(ticketId, 'taken')
  const proposed = new Date().toISOString()
  expect(await adjust(ticketId, event.id, proposed)).toMatchObject({
    statusCode: 204,
  })

  const offer = await context.db.execute(sql`
    select resolved_at from public.ticket_offers
    where ticket_id = ${ticketId} and status = 'taken'
  `)
  expect(
    iso((offer.rows[0] as { resolved_at: Date | string }).resolved_at),
  ).toBe(proposed)
  const assignment = await context.db.execute(sql`
    select assigned_at from public.ticket_assignments
    where ticket_id = ${ticketId} and stage = 'supervisor'
  `)
  expect(
    iso((assignment.rows[0] as { assigned_at: Date | string }).assigned_at),
  ).toBe(proposed)
})

it('mueve la asignación y la participación al ajustar al técnico', async () => {
  const ticketId = await createTicket(context, refs)
  await takeAndAssign(context, refs, ticketId)
  const event = await eventRow(ticketId, 'assigned_technician')
  const proposed = new Date().toISOString()
  expect(await adjust(ticketId, event.id, proposed)).toMatchObject({
    statusCode: 204,
  })

  const assignment = await context.db.execute(sql`
    select assigned_at from public.ticket_assignments
    where ticket_id = ${ticketId} and stage = 'technician'
  `)
  expect(
    iso((assignment.rows[0] as { assigned_at: Date | string }).assigned_at),
  ).toBe(proposed)
  const participant = await context.db.execute(sql`
    select started_at from public.ticket_participants
    where ticket_id = ${ticketId}
  `)
  expect(
    iso((participant.rows[0] as { started_at: Date | string }).started_at),
  ).toBe(proposed)
})

async function reopenedTicket(): Promise<{
  ticketId: string
  claimId: string
}> {
  const ticketId = await attendedTicket(context, refs)
  await context.db.execute(sql`
    insert into public.evidence (
      ticket_id, cycle, type, captured_by_technician_id, processing_state
    ) values (${ticketId}, 1, 'claim', ${refs.technicianId}, 'ready')
  `)
  const claim = await action(context, context.cookies.requester, ticketId, {
    action: 'open_claim',
    reasonId: await reasonId(context, 'claim'),
    description: 'La falla continúa',
    clientRequestId: randomUUID(),
  })
  expect(claim.statusCode).toBe(200)
  const resolved = await action(context, context.cookies.supervisor, ticketId, {
    action: 'resolve_claim',
    resolution: 'upheld',
    clientRequestId: randomUUID(),
  })
  expect(resolved.statusCode).toBe(200)
  const claimOpened = await eventRow(ticketId, 'claim_opened')
  return { ticketId, claimId: claimOpened.id }
}

it('no permite saltar de ciclo al ajustar un evento', async () => {
  const { ticketId, claimId } = await reopenedTicket()
  const response = await adjust(
    ticketId,
    claimId,
    new Date(Date.now() + 1_000).toISOString(),
  )
  expect(response.statusCode).toBe(409)
  expect((response.json() as { error: { code: string } }).error.code).toBe(
    'conflict',
  )
})

it('no cambia el folio al mover el registro de año', async () => {
  const ticketId = await closedTicket(context, refs)
  const created = await eventRow(ticketId, 'created')
  const previousYear = await adjust(
    ticketId,
    created.id,
    new Date(Date.UTC(2025, 11, 31, 12)).toISOString(),
  )
  expect(previousYear.statusCode).toBe(409)
  expect((previousYear.json() as { error: { code: string } }).error.code).toBe(
    'folio_year_change',
  )

  const sameYear = new Date(
    new Date(created.occurred_at).getTime() - 60_000,
  ).toISOString()
  expect(await adjust(ticketId, created.id, sameYear)).toMatchObject({
    statusCode: 204,
  })
  const ticket = await context.db.execute(sql`
    select reported_at from public.tickets where id = ${ticketId}
  `)
  expect(
    iso((ticket.rows[0] as { reported_at: Date | string }).reported_at),
  ).toBe(sameYear)
})
