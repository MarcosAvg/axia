import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it } from 'vitest'

import {
  action,
  closedTicket,
  createTicket,
  takeAndAssign,
} from './tickets-lifecycle-helpers.js'
import {
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'
import { reasonId } from './time-links-helpers.js'
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

async function backdate(ticketId: string, interval: string) {
  await context.db.execute(sql`
    update public.tickets
    set reported_at = reported_at - ${interval}::interval,
        closed_at = closed_at - ${interval}::interval
    where id = ${ticketId}
  `)
  await context.db.execute(sql`
    update public.ticket_events
    set occurred_at = occurred_at - ${interval}::interval
    where ticket_id = ${ticketId}
  `)
  await context.db.execute(sql`
    update public.ticket_participants
    set started_at = started_at - ${interval}::interval,
        ended_at = ended_at - ${interval}::interval
    where ticket_id = ${ticketId}
  `)
  await context.db.execute(sql`
    update public.ticket_assignments
    set assigned_at = assigned_at - ${interval}::interval,
        ended_at = ended_at - ${interval}::interval
    where ticket_id = ${ticketId}
  `)
  await context.db.execute(
    sql`select public.rebuild_ticket_time_spans(${ticketId})`,
  )
}

async function dormantMinutes(ticketId: string): Promise<number> {
  const result = await context.db.execute(sql`
    select extract(epoch from (ended_at - started_at)) / 60 as minutes
    from public.time_spans
    where ticket_id = ${ticketId} and kind = 'dormant'
    order by started_at desc limit 1
  `)
  return Number((result.rows[0] as { minutes: string }).minutes)
}

async function coverageDelta(ticketId: string): Promise<string> {
  const result = await context.db.execute(sql`
    select delta from public.v_ticket_phase_coverage where id = ${ticketId}
  `)
  return (result.rows[0] as { delta: string }).delta
}

it('mide como dormant el tiempo entre el cierre y la reclamación', async () => {
  const ticketId = await closedTicket(context, refs)
  await backdate(ticketId, '8 hours')
  await context.db.execute(sql`
    insert into public.evidence (
      ticket_id, cycle, type, captured_by_technician_id, processing_state
    ) values (${ticketId}, 1, 'claim', ${refs.technicianId}, 'ready')
  `)

  const claim = await action(context, context.cookies.supervisor, ticketId, {
    action: 'open_claim',
    reasonId: await reasonId(context, 'claim'),
    description: 'La falla volvió',
    clientRequestId: randomUUID(),
  })
  expect(claim.statusCode).toBe(200)

  expect(await dormantMinutes(ticketId)).toBeCloseTo(480, -1)
  const claimEvent = await context.db.execute(sql`
    select occurred_at from public.ticket_events
    where ticket_id = ${ticketId} and type = 'claim_opened'
    limit 1
  `)
  const claimSpan = await context.db.execute(sql`
    select started_at from public.time_spans
    where ticket_id = ${ticketId} and kind = 'claim'
    order by started_at desc limit 1
  `)
  expect(
    new Date(
      (claimSpan.rows[0] as { started_at: Date | string }).started_at,
    ).toISOString(),
  ).toBe(
    new Date(
      (claimEvent.rows[0] as { occurred_at: Date | string }).occurred_at,
    ).toISOString(),
  )
  expect(await coverageDelta(ticketId)).toBe('00:00:00')
})

it('mide como dormant el tiempo entre el descarte y la reactivación', async () => {
  const ticketId = await createTicket(context, refs)
  await takeAndAssign(context, refs, ticketId)
  const rejected = await action(context, context.cookies.supervisor, ticketId, {
    action: 'reject',
    reasonId: await reasonId(context, 'rejection'),
    clientRequestId: randomUUID(),
  })
  expect(rejected.statusCode).toBe(200)
  await backdate(ticketId, '2 days')

  const reactivated = await action(context, context.cookies.admin, ticketId, {
    action: 'reactivate',
    reasonId: await reasonId(context, 'reactivation'),
    clientRequestId: randomUUID(),
  })
  expect(reactivated.statusCode).toBe(200)

  expect(await dormantMinutes(ticketId)).toBeCloseTo(2880, -1)
  const reactivatedEvent = await context.db.execute(sql`
    select occurred_at from public.ticket_events
    where ticket_id = ${ticketId} and type = 'reactivated'
    limit 1
  `)
  const waitSpan = await context.db.execute(sql`
    select started_at from public.time_spans
    where ticket_id = ${ticketId} and kind = 'wait_start'
    order by started_at desc limit 1
  `)
  expect(
    new Date(
      (waitSpan.rows[0] as { started_at: Date | string }).started_at,
    ).toISOString(),
  ).toBe(
    new Date(
      (reactivatedEvent.rows[0] as { occurred_at: Date | string }).occurred_at,
    ).toISOString(),
  )
  expect(await coverageDelta(ticketId)).toBe('00:00:00')
})
