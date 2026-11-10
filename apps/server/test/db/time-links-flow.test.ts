import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it } from 'vitest'

import {
  action,
  attendedTicket,
  createTicket,
  takeAndAssign,
} from './tickets-lifecycle-helpers.js'
import {
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'
import { lastEventId, reasonId } from './time-links-helpers.js'
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

async function claimEvidence(ticketId: string) {
  await context.db.execute(sql`
    insert into public.evidence (
      ticket_id, cycle, type, captured_by_technician_id, processing_state
    ) values (${ticketId}, 1, 'claim', ${refs.technicianId}, 'ready')
  `)
}

it('enlaza la reclamación abierta y resuelta con sus eventos', async () => {
  const ticketId = await attendedTicket(context, refs)
  await claimEvidence(ticketId)
  const opened = await action(context, context.cookies.requester, ticketId, {
    action: 'open_claim',
    reasonId: await reasonId(context, 'claim'),
    description: 'La falla continúa',
    clientRequestId: randomUUID(),
  })
  expect(opened.statusCode).toBe(200)
  const openedEvent = await lastEventId(context, ticketId, 'claim_opened')

  const claim = await context.db.execute(sql`
    select opened_event_id, resolved_event_id from public.ticket_claims
    where ticket_id = ${ticketId}
  `)
  const claimRow = claim.rows[0] as {
    opened_event_id: string | number
    resolved_event_id: string | number | null
  }
  expect(String(claimRow.opened_event_id)).toBe(openedEvent)

  const ended = await context.db.execute(sql`
    select count(*)::int as count from public.ticket_participants
    where ticket_id = ${ticketId}
      and ended_at is not null and ended_event_id is null
  `)
  expect((ended.rows[0] as { count: number }).count).toBe(0)

  const resolved = await action(context, context.cookies.supervisor, ticketId, {
    action: 'resolve_claim',
    resolution: 'dismissed',
    clientRequestId: randomUUID(),
  })
  expect(resolved.statusCode).toBe(200)
  const resolvedEvent = await lastEventId(context, ticketId, 'claim_resolved')
  const resolvedClaim = await context.db.execute(sql`
    select resolved_event_id from public.ticket_claims
    where ticket_id = ${ticketId}
  `)
  expect(
    String(
      (resolvedClaim.rows[0] as { resolved_event_id: string | number })
        .resolved_event_id,
    ),
  ).toBe(resolvedEvent)
})

it('enlaza la recaptura con su evento', async () => {
  const ticketId = await createTicket(context, refs)
  const taken = await action(context, context.cookies.supervisor, ticketId, {
    action: 'take',
    clientRequestId: randomUUID(),
  })
  expect(taken.statusCode).toBe(200)
  const recaptured = await action(
    context,
    context.cookies.supervisor,
    ticketId,
    {
      action: 'recapture',
      changes: { description: 'Recaptura enlazada al evento' },
      clientRequestId: randomUUID(),
    },
  )
  expect(recaptured.statusCode).toBe(200)
  const eventId = await lastEventId(context, ticketId, 'capture_recaptured')
  const capture = await context.db.execute(sql`
    select event_id, changed_at from public.ticket_captures
    where ticket_id = ${ticketId}
    order by changed_at desc
    limit 1
  `)
  const row = capture.rows[0] as {
    event_id: string | number
    changed_at: Date | string
  }
  expect(String(row.event_id)).toBe(eventId)

  const event = await context.db.execute(sql`
    select occurred_at from public.ticket_events where id = ${Number(eventId)}
  `)
  expect(new Date(row.changed_at).toISOString()).toBe(
    new Date(
      (event.rows[0] as { occurred_at: Date | string }).occurred_at,
    ).toISOString(),
  )
})

it('enlaza el descarte con las participaciones que cierra', async () => {
  const ticketId = await createTicket(context, refs)
  await takeAndAssign(context, refs, ticketId)
  const rejected = await action(context, context.cookies.supervisor, ticketId, {
    action: 'reject',
    reasonId: await reasonId(context, 'rejection'),
    clientRequestId: randomUUID(),
  })
  expect(rejected.statusCode).toBe(200)
  const rejectedEvent = await lastEventId(context, ticketId, 'rejected')

  const rows = await context.db.execute(sql`
    select
      (select ended_event_id from public.ticket_participants
        where ticket_id = ${ticketId} limit 1) as participant,
      (select ended_event_id from public.ticket_assignments
        where ticket_id = ${ticketId} and stage = 'technician'
        limit 1) as assignment
  `)
  expect(rows.rows[0]).toMatchObject({
    participant: rejectedEvent,
    assignment: rejectedEvent,
  })
})
