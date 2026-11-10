import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it } from 'vitest'

import {
  action,
  addEvidence,
  createTicket,
  takeAndAssign,
} from './tickets-lifecycle-helpers.js'
import {
  authHeaders,
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

async function pausedTicket(): Promise<string> {
  const ticketId = await createTicket(context, refs)
  await takeAndAssign(context, refs, ticketId)
  await addEvidence(context, refs, ticketId, 'before')
  await action(context, context.cookies.technician, ticketId, {
    action: 'start',
    clientRequestId: randomUUID(),
  })
  const paused = await action(context, context.cookies.technician, ticketId, {
    action: 'pause',
    reasonId: refs.pauseReasonId,
    clientRequestId: randomUUID(),
  })
  expect(paused.statusCode).toBe(200)
  return ticketId
}

async function openPauses(ticketId: string) {
  const result = await context.db.execute(sql`
    select id, cycle, reason_id, root_reason_id
    from public.ticket_pauses
    where ticket_id = ${ticketId} and closed_at is null
  `)
  return result.rows as Array<{
    id: string
    cycle: number
    reason_id: string
    root_reason_id: string
  }>
}

it('reabre la pausa al reactivar un tiquet pausado', async () => {
  const ticketId = await pausedTicket()
  const cancelled = await action(
    context,
    context.cookies.supervisor,
    ticketId,
    {
      action: 'cancel',
      reasonId: await reasonId(context, 'cancellation'),
      clientRequestId: randomUUID(),
    },
  )
  expect(cancelled.statusCode).toBe(200)
  expect(await openPauses(ticketId)).toHaveLength(0)

  const reactivated = await action(context, context.cookies.admin, ticketId, {
    action: 'reactivate',
    reasonId: await reasonId(context, 'reactivation'),
    clientRequestId: randomUUID(),
  })
  expect(reactivated.statusCode).toBe(200)

  const ticket = await context.db.execute(sql`
    select status, cycle from public.tickets where id = ${ticketId}
  `)
  expect(ticket.rows[0]).toMatchObject({ status: 'paused', cycle: 1 })

  const pauses = await openPauses(ticketId)
  expect(pauses).toHaveLength(1)
  expect(pauses[0]).toMatchObject({
    cycle: 1,
    root_reason_id: refs.pauseReasonId,
  })

  const state = await context.app.inject({
    method: 'GET',
    url: `/api/tickets/${ticketId}/pause-state`,
    headers: authHeaders(context.cookies.technician),
  })
  expect(state.statusCode).toBe(200)
  expect((state.json() as { item: { pauseId: string } }).item.pauseId).toBe(
    pauses[0]?.id,
  )

  const assignment = await context.db.execute(sql`
    select count(*)::int as count from public.ticket_assignments
    where ticket_id = ${ticketId}
      and stage = 'technician' and ended_at is null
  `)
  expect((assignment.rows[0] as { count: number }).count).toBe(1)

  const child = await context.db.execute(sql`
    select id from public.reasons
    where parent_id = ${refs.pauseReasonId} order by name limit 1
  `)
  const resumed = await action(context, context.cookies.technician, ticketId, {
    action: 'resume',
    reasonId: (child.rows[0] as { id: string }).id,
    clientRequestId: randomUUID(),
  })
  expect(resumed.statusCode).toBe(200)
  const resumedTicket = await context.db.execute(sql`
    select status from public.tickets where id = ${ticketId}
  `)
  expect(resumedTicket.rows[0]).toMatchObject({ status: 'in_progress' })
})
