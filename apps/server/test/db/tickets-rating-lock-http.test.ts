import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { appConnectionString } from './helpers.js'
import {
  action as runAction,
  attendedTicket as createAttendedTicket,
  closedTicket as createClosedTicket,
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
const attendedTicket = () => createAttendedTicket(context, refs)
const closedTicket = () => createClosedTicket(context, refs)

beforeAll(async () => {
  context = await buildTicketHttpApp({
    runtimeConnectionString: appConnectionString(),
  })
  refs = await loadWriteRefs(context)
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

async function validatedAttendedTicket() {
  const ticketId = await attendedTicket()
  const validation = await action(context.cookies.requester, ticketId, {
    action: 'validate',
    clientRequestId: randomUUID(),
  })
  expect(validation.statusCode).toBe(200)
  return ticketId
}

async function reasonId(use: string) {
  const reasons = await context.db.execute(sql`
    select id from public.reasons
    where use = ${use} and active and parent_id is null
    limit 1
  `)
  return (reasons.rows[0] as { id: string }).id
}

async function addClaimEvidence(ticketId: string) {
  await context.db.execute(sql`
    insert into public.evidence (
      ticket_id, cycle, type, captured_by_technician_id, processing_state
    ) values (${ticketId}, 1, 'claim', ${refs.technicianId}, 'ready')
  `)
}

async function openClaimAs(cookie: string, ticketId: string) {
  return action(cookie, ticketId, {
    action: 'open_claim',
    reasonId: await reasonId('claim'),
    description: 'La reparación no quedó bien',
    clientRequestId: randomUUID(),
  })
}

describe('satisfaction', () => {
  it('allows a supervisor to rate on behalf of the requester', async () => {
    const ticketId = await closedTicket()
    const rated = await action(context.cookies.supervisor, ticketId, {
      action: 'rate',
      score: 5,
      clientRequestId: randomUUID(),
    })
    expect(rated.statusCode).toBe(200)

    const rating = await context.db.execute(sql`
      select score, rated_by from public.ticket_ratings
      where ticket_id = ${ticketId}
    `)
    expect(rating.rows[0]).toMatchObject({ score: 5 })
  })

  it('rates after the requester validates, before the supervisor closes', async () => {
    const ticketId = await validatedAttendedTicket()
    const rated = await action(context.cookies.requester, ticketId, {
      action: 'rate',
      score: 4,
      clientRequestId: randomUUID(),
    })
    expect(rated.statusCode).toBe(200)
  })
})

describe('satisfaction rules', () => {
  it('rejects rating an attended ticket without requester validation', async () => {
    const ticketId = await attendedTicket()
    const rated = await action(context.cookies.requester, ticketId, {
      action: 'rate',
      score: 4,
      clientRequestId: randomUUID(),
    })
    expect(rated.statusCode).toBe(409)
  })

  it('keeps the first rating and rejects a second one', async () => {
    const ticketId = await closedTicket()
    const first = await action(context.cookies.requester, ticketId, {
      action: 'rate',
      score: 5,
      clientRequestId: randomUUID(),
    })
    expect(first.statusCode).toBe(200)
    const second = await action(context.cookies.requester, ticketId, {
      action: 'rate',
      score: 1,
      clientRequestId: randomUUID(),
    })
    expect(second.statusCode).toBe(409)

    const rating = await context.db.execute(sql`
      select score from public.ticket_ratings
      where ticket_id = ${ticketId}
    `)
    expect(rating.rows).toEqual([{ score: 5 }])
  })
})

describe('validated requester edits', () => {
  it('cannot cancel or comment while the ticket is still attended', async () => {
    const ticketId = await validatedAttendedTicket()
    const cancelled = await action(context.cookies.requester, ticketId, {
      action: 'cancel',
      reasonId: await reasonId('cancellation'),
      clientRequestId: randomUUID(),
    })
    expect(cancelled.statusCode).toBe(409)

    const commented = await action(context.cookies.requester, ticketId, {
      action: 'comment',
      text: 'Intento de edición después de validar',
      clientRequestId: randomUUID(),
    })
    expect(commented.statusCode).toBe(409)
  })

  it('replays a comment applied before validating instead of rejecting it', async () => {
    const ticketId = await attendedTicket()
    const clientRequestId = randomUUID()
    const comment = {
      action: 'comment',
      text: 'Comentario previo a la validación',
      clientRequestId,
    }
    const applied = await action(context.cookies.requester, ticketId, comment)
    expect(applied.statusCode).toBe(200)

    await action(context.cookies.requester, ticketId, {
      action: 'validate',
      clientRequestId: randomUUID(),
    })

    const replayed = await action(context.cookies.requester, ticketId, comment)
    expect(replayed.statusCode).toBe(200)
    expect(replayed.json()).toMatchObject({
      action: 'comment',
      replayed: true,
    })
  })
})

describe('validated requester cannot claim', () => {
  it('rejects a claim after validating while the ticket is attended', async () => {
    const ticketId = await validatedAttendedTicket()
    await addClaimEvidence(ticketId)
    const claim = await openClaimAs(context.cookies.requester, ticketId)
    expect(claim.statusCode).toBe(409)
  })

  it('rejects a claim after the ticket is closed', async () => {
    const ticketId = await closedTicket()
    await addClaimEvidence(ticketId)
    const claim = await openClaimAs(context.cookies.requester, ticketId)
    expect(claim.statusCode).toBe(409)
  })
})

describe('supervisor claim after requester validation', () => {
  it('opens on behalf but keeps the requester read-only', async () => {
    const ticketId = await validatedAttendedTicket()
    await addClaimEvidence(ticketId)
    const claim = await openClaimAs(context.cookies.supervisor, ticketId)
    expect(claim.statusCode).toBe(200)

    const commented = await action(context.cookies.requester, ticketId, {
      action: 'comment',
      text: 'Comentario durante la reclamación',
      clientRequestId: randomUUID(),
    })
    expect(commented.statusCode).toBe(409)
  })
})

describe('validated requester detail', () => {
  it('exposes the requester validation state', async () => {
    const ticketId = await validatedAttendedTicket()
    const asRequester = await context.app.inject({
      method: 'GET',
      url: `/api/tickets/${ticketId}`,
      headers: authHeaders(context.cookies.requester),
    })
    expect(asRequester.statusCode).toBe(200)
    expect((asRequester.json() as { ticket: unknown }).ticket).toMatchObject({
      isRequester: true,
      requesterValidated: true,
    })

    const asSupervisor = await context.app.inject({
      method: 'GET',
      url: `/api/tickets/${ticketId}`,
      headers: authHeaders(context.cookies.supervisor),
    })
    expect(asSupervisor.statusCode).toBe(200)
    expect((asSupervisor.json() as { ticket: unknown }).ticket).toMatchObject({
      isRequester: false,
      requesterValidated: true,
    })
  })
})
