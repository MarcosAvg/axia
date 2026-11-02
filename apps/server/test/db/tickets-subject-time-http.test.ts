import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { appConnectionString } from './helpers.js'
import {
  action as runAction,
  addEvidence,
  attendedTicket,
  createTicket,
  takeAndAssign,
} from './tickets-lifecycle-helpers.js'
import {
  authHeaders,
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'
import { loadWriteRefs, type WriteRefs } from './tickets-write-helpers.js'

let context: TicketHttpContext
let refs: WriteRefs

const action = (
  cookie: string,
  ticketId: string,
  payload: Record<string, unknown>,
) => runAction(context, cookie, ticketId, payload)

async function reasonId(use: string) {
  const result = await context.db.execute(sql`
    select id from public.reasons
    where use = ${use} and active and parent_id is null
    limit 1
  `)
  return (result.rows[0] as { id: string }).id
}

async function getJson(path: string) {
  const response = await context.app.inject({
    method: 'GET',
    url: path,
    headers: authHeaders(context.cookies.admin),
  })
  expect(response.statusCode).toBe(200)
  return response.json() as { items: Record<string, unknown>[] }
}

beforeAll(async () => {
  context = await buildTicketHttpApp({
    runtimeConnectionString: appConnectionString(),
  })
  refs = await loadWriteRefs(context)
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

describe('technician proxy attribution', () => {
  it('records the subject technician in the event and time span', async () => {
    const ticketId = await createTicket(context, refs)
    await takeAndAssign(context, refs, ticketId)
    await addEvidence(context, refs, ticketId, 'before')
    const started = await action(context.cookies.admin, ticketId, {
      action: 'start',
      subjectTechnicianId: refs.technicianId,
      clientRequestId: randomUUID(),
    })
    expect(started.statusCode).toBe(200)

    const event = await context.db.execute(sql`
      select subject_technician_id from public.ticket_events
      where ticket_id = ${ticketId} and type = 'started'
    `)
    expect(event.rows[0]).toMatchObject({
      subject_technician_id: refs.technicianId,
    })
    const span = await context.db.execute(sql`
      select subject_technician_id from public.time_spans
      where ticket_id = ${ticketId} and kind = 'active_work'
      order by started_at desc limit 1
    `)
    expect(span.rows[0]).toMatchObject({
      subject_technician_id: refs.technicianId,
    })
  })

  it('exposes the attributed time in the metrics endpoint', async () => {
    const body = await getJson('/api/metrics/technician-subject-times')
    const row = body.items.find(
      (item) => item.technician_id === refs.technicianId,
    )
    expect(row).toBeDefined()
    expect(row?.active_time).toEqual(expect.any(String))
  })
})

describe('proxy evidence attribution', () => {
  it('attributes workload evidence to the proxy technician', async () => {
    const ticketId = await createTicket(context, refs)
    await takeAndAssign(context, refs, ticketId)
    const response = await context.app.inject({
      method: 'POST',
      url: `/api/tickets/${ticketId}/evidence`,
      headers: authHeaders(context.cookies.admin),
      payload: {
        type: 'before',
        clientRequestId: randomUUID(),
        subjectTechnicianId: refs.technicianId,
      },
    })
    expect(response.statusCode).toBe(201)

    const evidence = await context.db.execute(sql`
      select captured_by_technician_id from public.evidence
      where ticket_id = ${ticketId} limit 1
    `)
    expect(evidence.rows[0]).toMatchObject({
      captured_by_technician_id: refs.technicianId,
    })
    const event = await context.db.execute(sql`
      select subject_technician_id from public.ticket_events
      where ticket_id = ${ticketId} and type = 'evidence_added'
      order by id desc limit 1
    `)
    expect(event.rows[0]).toMatchObject({
      subject_technician_id: refs.technicianId,
    })
  })
})

describe('requester proxy attribution', () => {
  it('attributes validation subject and splits the validation span', async () => {
    const ticketId = await attendedTicket(context, refs)
    const validated = await action(context.cookies.requester, ticketId, {
      action: 'validate',
      clientRequestId: randomUUID(),
    })
    expect(validated.statusCode).toBe(200)

    const event = await context.db.execute(sql`
      select subject_requester_id from public.ticket_events
      where ticket_id = ${ticketId} and type = 'validated'
      order by id desc limit 1
    `)
    expect(event.rows[0]).toMatchObject({
      subject_requester_id: refs.requesterId,
    })
    const spans = await context.db.execute(sql`
      select subject_requester_id, subject_user_id
      from public.time_spans
      where ticket_id = ${ticketId} and kind = 'validation'
      order by started_at
    `)
    expect(spans.rows[0]).toMatchObject({
      subject_requester_id: refs.requesterId,
    })
    expect(spans.rows[1]).toMatchObject({
      subject_user_id: expect.any(String),
    })
  })

  it('counts the validation time for the requester', async () => {
    const body = await getJson('/api/metrics/requester-times')
    const row = body.items.find(
      (item) => item.requester_id === refs.requesterId,
    )
    expect(row).toBeDefined()
    expect(row?.validation_time).toEqual(expect.any(String))
  })
})

describe('requester claim and cancellation attribution', () => {
  it('records the requester subject when opening a claim', async () => {
    const ticketId = await attendedTicket(context, refs)
    await context.db.execute(sql`
      insert into public.evidence (
        ticket_id, cycle, type, captured_by_technician_id, processing_state
      ) values (${ticketId}, 1, 'claim', ${refs.technicianId}, 'ready')
    `)
    const claim = await action(context.cookies.requester, ticketId, {
      action: 'open_claim',
      reasonId: await reasonId('claim'),
      description: 'La reparación no quedó bien',
      clientRequestId: randomUUID(),
    })
    expect(claim.statusCode).toBe(200)
    const event = await context.db.execute(sql`
      select subject_requester_id from public.ticket_events
      where ticket_id = ${ticketId} and type = 'claim_opened'
    `)
    expect(event.rows[0]).toMatchObject({
      subject_requester_id: refs.requesterId,
    })
  })

  it('records the requester subject when cancelling', async () => {
    const ticketId = await createTicket(context, refs)
    const cancelled = await action(context.cookies.requester, ticketId, {
      action: 'cancel',
      reasonId: await reasonId('cancellation'),
      clientRequestId: randomUUID(),
    })
    expect(cancelled.statusCode).toBe(200)
    const event = await context.db.execute(sql`
      select subject_requester_id from public.ticket_events
      where ticket_id = ${ticketId} and type = 'cancelled'
    `)
    expect(event.rows[0]).toMatchObject({
      subject_requester_id: refs.requesterId,
    })
  })
})
