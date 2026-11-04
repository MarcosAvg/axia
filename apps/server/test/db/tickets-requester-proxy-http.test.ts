import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { appConnectionString } from './helpers.js'
import {
  action as runAction,
  attendedTicket,
  createTicket,
} from './tickets-lifecycle-helpers.js'
import {
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

async function addClaimEvidence(ticketId: string) {
  await context.db.execute(sql`
    insert into public.evidence (
      ticket_id, cycle, type, captured_by_technician_id, processing_state
    ) values (${ticketId}, 1, 'claim', ${refs.technicianId}, 'ready')
  `)
}

async function subjectOf(ticketId: string, type: string) {
  const result = await context.db.execute(sql`
    select subject_requester_id, subject_user_id
    from public.ticket_events
    where ticket_id = ${ticketId} and type = ${type}
    order by id desc
    limit 1
  `)
  return result.rows[0] as {
    subject_requester_id: string | null
    subject_user_id: string | null
  }
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

describe('requester proxy cancellation', () => {
  it('attributes an own cancellation to the supervisor', async () => {
    const ticketId = await createTicket(context, refs)
    await action(context.cookies.supervisor, ticketId, {
      action: 'take',
      clientRequestId: randomUUID(),
    })
    const cancelled = await action(context.cookies.supervisor, ticketId, {
      action: 'cancel',
      reasonId: await reasonId('cancellation'),
      clientRequestId: randomUUID(),
    })
    expect(cancelled.statusCode).toBe(200)
    expect(await subjectOf(ticketId, 'cancelled')).toMatchObject({
      subject_requester_id: null,
      subject_user_id: expect.any(String),
    })
  })

  it('attributes a proxy cancellation to the requester', async () => {
    const ticketId = await createTicket(context, refs)
    await action(context.cookies.supervisor, ticketId, {
      action: 'take',
      clientRequestId: randomUUID(),
    })
    const cancelled = await action(context.cookies.supervisor, ticketId, {
      action: 'cancel',
      reasonId: await reasonId('cancellation'),
      subjectRequesterId: refs.requesterId,
      clientRequestId: randomUUID(),
    })
    expect(cancelled.statusCode).toBe(200)
    expect(await subjectOf(ticketId, 'cancelled')).toMatchObject({
      subject_requester_id: refs.requesterId,
      subject_user_id: null,
    })
  })
})

describe('requester proxy claims', () => {
  it('attributes an own claim to the supervisor', async () => {
    const ticketId = await attendedTicket(context, refs)
    await addClaimEvidence(ticketId)
    const claim = await action(context.cookies.supervisor, ticketId, {
      action: 'open_claim',
      reasonId: await reasonId('claim'),
      description: 'La reparación no quedó bien',
      clientRequestId: randomUUID(),
    })
    expect(claim.statusCode).toBe(200)
    expect(await subjectOf(ticketId, 'claim_opened')).toMatchObject({
      subject_requester_id: null,
      subject_user_id: expect.any(String),
    })
  })

  it('attributes a proxy claim to the requester', async () => {
    const ticketId = await attendedTicket(context, refs)
    await addClaimEvidence(ticketId)
    const claim = await action(context.cookies.supervisor, ticketId, {
      action: 'open_claim',
      reasonId: await reasonId('claim'),
      description: 'La reparación no quedó bien',
      subjectRequesterId: refs.requesterId,
      clientRequestId: randomUUID(),
    })
    expect(claim.statusCode).toBe(200)
    expect(await subjectOf(ticketId, 'claim_opened')).toMatchObject({
      subject_requester_id: refs.requesterId,
      subject_user_id: null,
    })
  })
})

describe('requester proxy permissions', () => {
  it('rejects a subject that is not the ticket requester', async () => {
    const ticketId = await createTicket(context, refs)
    await action(context.cookies.supervisor, ticketId, {
      action: 'take',
      clientRequestId: randomUUID(),
    })
    const cancelled = await action(context.cookies.supervisor, ticketId, {
      action: 'cancel',
      reasonId: await reasonId('cancellation'),
      subjectRequesterId: randomUUID(),
      clientRequestId: randomUUID(),
    })
    expect(cancelled.statusCode).toBe(400)
  })

  it('rejects a proxy without the on-behalf permission', async () => {
    const ticketId = await attendedTicket(context, refs)
    await addClaimEvidence(ticketId)
    const claim = await action(context.cookies.requester, ticketId, {
      action: 'open_claim',
      reasonId: await reasonId('claim'),
      description: 'La reparación no quedó bien',
      subjectRequesterId: refs.requesterId,
      clientRequestId: randomUUID(),
    })
    expect(claim.statusCode).toBe(403)
  })
})
