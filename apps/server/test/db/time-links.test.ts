import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it } from 'vitest'

import {
  action,
  addEvidence,
  closedTicket,
  createTicket,
  takeAndAssign,
} from './tickets-lifecycle-helpers.js'
import {
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'
import { childReasonId, lastEventId } from './time-links-helpers.js'
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

async function startedTicket(): Promise<string> {
  const ticketId = await createTicket(context, refs)
  await takeAndAssign(context, refs, ticketId)
  await addEvidence(context, refs, ticketId, 'before')
  await action(context, context.cookies.technician, ticketId, {
    action: 'start',
    clientRequestId: randomUUID(),
  })
  return ticketId
}

async function pauseRow(ticketId: string) {
  const result = await context.db.execute(sql`
    select id, opened_event_id, closed_event_id
    from public.ticket_pauses
    where ticket_id = ${ticketId}
    order by opened_at desc
    limit 1
  `)
  return result.rows[0] as {
    id: string
    opened_event_id: string | number | null
    closed_event_id: string | number | null
  }
}

async function steps(pauseId: string) {
  const result = await context.db.execute(sql`
    select id, entered_event_id, exited_event_id
    from public.ticket_pause_steps
    where pause_id = ${pauseId}
    order by entered_at, reason_id
  `)
  return result.rows as Array<{
    id: string
    entered_event_id: string | number | null
    exited_event_id: string | number | null
  }>
}

it('enlaza la pausa y sus pasos con sus eventos', async () => {
  const ticketId = await startedTicket()
  const paused = await action(context, context.cookies.technician, ticketId, {
    action: 'pause',
    reasonId: refs.pauseReasonId,
    clientRequestId: randomUUID(),
  })
  expect(paused.statusCode).toBe(200)

  const pausedEvent = await lastEventId(context, ticketId, 'paused')
  const pause = await pauseRow(ticketId)
  expect(String(pause.opened_event_id)).toBe(pausedEvent)
  const openedSteps = await steps(pause.id)
  expect(String(openedSteps[0]?.entered_event_id)).toBe(pausedEvent)

  const childId = await childReasonId(context, refs.pauseReasonId)
  const advanced = await action(context, context.cookies.technician, ticketId, {
    action: 'advance_pause',
    reasonId: childId,
    clientRequestId: randomUUID(),
  })
  expect(advanced.statusCode).toBe(200)
  const advancedEvent = await lastEventId(context, ticketId, 'pause_advanced')
  const advancedSteps = await steps(pause.id)
  expect(advancedSteps).toHaveLength(2)
  expect(String(advancedSteps[0]?.exited_event_id)).toBe(advancedEvent)
  expect(String(advancedSteps[1]?.entered_event_id)).toBe(advancedEvent)

  const resumed = await action(context, context.cookies.technician, ticketId, {
    action: 'resume',
    reasonId: childId,
    clientRequestId: randomUUID(),
  })
  expect(resumed.statusCode).toBe(200)
  const resumedEvent = await lastEventId(context, ticketId, 'resumed')
  const closed = await pauseRow(ticketId)
  expect(String(closed.closed_event_id)).toBe(resumedEvent)
  const resumedSteps = await steps(pause.id)
  expect(String(resumedSteps[1]?.exited_event_id)).toBe(resumedEvent)
})

it('enlaza ofertas, asignaciones y participaciones con su evento', async () => {
  const ticketId = await createTicket(context, refs)
  const taken = await action(context, context.cookies.supervisor, ticketId, {
    action: 'take',
    clientRequestId: randomUUID(),
  })
  expect(taken.statusCode).toBe(200)
  const takenEvent = await lastEventId(context, ticketId, 'taken')

  const offers = await context.db.execute(sql`
    select resolved_event_id from public.ticket_offers
    where ticket_id = ${ticketId} and status = 'taken'
  `)
  expect(
    String(
      (offers.rows[0] as { resolved_event_id: string | number })
        .resolved_event_id,
    ),
  ).toBe(takenEvent)

  const supervisorAssignment = await context.db.execute(sql`
    select assigned_event_id from public.ticket_assignments
    where ticket_id = ${ticketId} and stage = 'supervisor'
  `)
  expect(
    String(
      (supervisorAssignment.rows[0] as { assigned_event_id: string | number })
        .assigned_event_id,
    ),
  ).toBe(takenEvent)

  const assigned = await action(context, context.cookies.supervisor, ticketId, {
    action: 'assign_technician',
    technicianId: refs.technicianId,
    clientRequestId: randomUUID(),
  })
  expect(assigned.statusCode).toBe(200)
  const assignedEvent = await lastEventId(
    context,
    ticketId,
    'assigned_technician',
  )

  const assignment = await context.db.execute(sql`
    select assigned_event_id from public.ticket_assignments
    where ticket_id = ${ticketId} and stage = 'technician'
  `)
  expect(
    String(
      (assignment.rows[0] as { assigned_event_id: string | number })
        .assigned_event_id,
    ),
  ).toBe(assignedEvent)

  const participant = await context.db.execute(sql`
    select started_event_id from public.ticket_participants
    where ticket_id = ${ticketId}
  `)
  expect(
    String(
      (participant.rows[0] as { started_event_id: string | number })
        .started_event_id,
    ),
  ).toBe(assignedEvent)
})

it('enlaza cada validación con su evento y el cierre con sus filas', async () => {
  const ticketId = await closedTicket(context, refs)
  const validations = await context.db.execute(sql`
    select v.validator_role, v.validated_at, v.event_id, e.occurred_at,
      e.payload->>'role' as event_role
    from public.ticket_validations v
    join public.ticket_events e on e.id = v.event_id
    where v.ticket_id = ${ticketId}
    order by v.validated_at
  `)
  const rows = validations.rows as Array<{
    validator_role: string
    validated_at: Date | string
    event_id: string | number
    occurred_at: Date | string
    event_role: string
  }>
  expect(rows).toHaveLength(2)
  for (const row of rows) {
    expect(row.event_role).toBe(row.validator_role)
    expect(new Date(row.occurred_at).toISOString()).toBe(
      new Date(row.validated_at).toISOString(),
    )
  }

  const closedEvent = await lastEventId(context, ticketId, 'validated')
  const ended = await context.db.execute(sql`
    select
      (select count(*)::int from public.ticket_participants
        where ticket_id = ${ticketId} and ended_event_id is null
        and ended_at is not null) as open_links,
      (select count(*)::int from public.ticket_assignments
        where ticket_id = ${ticketId} and stage = 'technician'
        and ended_event_id is null and ended_at is not null) as assignment_links
  `)
  expect(ended.rows[0]).toMatchObject({
    open_links: 0,
    assignment_links: 0,
  })
  const lastParticipant = await context.db.execute(sql`
    select ended_event_id from public.ticket_participants
    where ticket_id = ${ticketId}
  `)
  expect(
    String(
      (lastParticipant.rows[0] as { ended_event_id: string | number })
        .ended_event_id,
    ),
  ).toBe(closedEvent)
})
