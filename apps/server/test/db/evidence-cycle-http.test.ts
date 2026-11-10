import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it } from 'vitest'

import { action, attendedTicket } from './tickets-lifecycle-helpers.js'
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

function upload(ticketId: string, payload: Record<string, unknown>) {
  return context.app.inject({
    method: 'POST',
    url: `/api/tickets/${ticketId}/evidence`,
    headers: authHeaders(context.cookies.technician),
    payload: {
      type: 'before',
      mimeType: 'image/png',
      clientRequestId: randomUUID(),
      ...payload,
    },
  })
}

async function reopenedTicket(): Promise<string> {
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
  return ticketId
}

async function evidenceCycle(ticketId: string): Promise<number> {
  const result = await context.db.execute(sql`
    select cycle from public.evidence
    where ticket_id = ${ticketId} and type = 'before'
    order by occurred_at desc limit 1
  `)
  return (result.rows[0] as { cycle: number }).cycle
}

async function hasBefore(ticketId: string, cycle: number): Promise<boolean> {
  const result = await context.db.execute(sql`
    select exists (
      select 1 from public.evidence
      where ticket_id = ${ticketId} and cycle = ${cycle} and type = 'before'
    ) as present
  `)
  return Boolean((result.rows[0] as { present: boolean }).present)
}

async function markReady(ticketId: string, cycle: number) {
  await context.db.execute(sql`
    update public.evidence set processing_state = 'ready'
    where ticket_id = ${ticketId} and cycle = ${cycle} and type = 'before'
  `)
}

it('conserva el ciclo de captura de una evidencia subida después de reabrir', async () => {
  const ticketId = await reopenedTicket()
  const uploaded = await upload(ticketId, { cycle: 1 })
  expect(uploaded.statusCode).toBe(201)
  expect(await evidenceCycle(ticketId)).toBe(1)
  expect(await hasBefore(ticketId, 2)).toBe(false)
  await markReady(ticketId, 1)

  const startWithoutCycleEvidence = await action(
    context,
    context.cookies.technician,
    ticketId,
    { action: 'start', clientRequestId: randomUUID() },
  )
  expect(startWithoutCycleEvidence.statusCode).toBe(409)

  const current = await upload(ticketId, { cycle: 2 })
  expect(current.statusCode).toBe(201)
  await markReady(ticketId, 2)
  const started = await action(context, context.cookies.technician, ticketId, {
    action: 'start',
    clientRequestId: randomUUID(),
  })
  expect(started.statusCode).toBe(200)
})

it('rechaza un ciclo de captura mayor al actual', async () => {
  const ticketId = await attendedTicket(context, refs)
  const response = await upload(ticketId, { cycle: 2 })
  expect(response.statusCode).toBe(400)
  expect((response.json() as { error: { code: string } }).error.code).toBe(
    'invalid_cycle',
  )
})

it('usa el ciclo actual si no se envía', async () => {
  const ticketId = await attendedTicket(context, refs)
  const response = await upload(ticketId, {})
  expect(response.statusCode).toBe(201)
  expect(await evidenceCycle(ticketId)).toBe(1)
})
