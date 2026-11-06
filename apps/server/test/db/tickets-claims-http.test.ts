import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  authHeaders,
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'
import { loadWriteRefs, type WriteRefs } from './tickets-write-helpers.js'

let context: TicketHttpContext
let refs: WriteRefs
let claimReasonId: string

function ticketBody() {
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
    description: `Tiquet de reclamación ${randomUUID()}`,
    requesterId: refs.requesterId,
    clientRequestId: randomUUID(),
  }
}

async function action(
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

async function createTicket(): Promise<string> {
  const response = await context.app.inject({
    method: 'POST',
    url: '/api/tickets',
    headers: authHeaders(context.cookies.requester),
    payload: ticketBody(),
  })
  expect(response.statusCode).toBe(201)
  return (response.json() as { ticket: { id: string } }).ticket.id
}

async function evidence(ticketId: string, type: string) {
  await context.db.execute(sql`
    insert into public.evidence (
      ticket_id, cycle, type, captured_by_technician_id, processing_state
    ) values (${ticketId}, 1, ${type}, ${refs.technicianId}, 'ready')
  `)
}

async function attendTicket(ticketId: string) {
  const take = await action(context.cookies.supervisor, ticketId, {
    action: 'take',
    clientRequestId: randomUUID(),
  })
  expect(take.statusCode).toBe(200)
  const assign = await action(context.cookies.supervisor, ticketId, {
    action: 'assign_technician',
    technicianId: refs.technicianId,
    clientRequestId: randomUUID(),
  })
  expect(assign.statusCode).toBe(200)
  await evidence(ticketId, 'before')
  const start = await action(context.cookies.technician, ticketId, {
    action: 'start',
    clientRequestId: randomUUID(),
  })
  expect(start.statusCode).toBe(200)
  await evidence(ticketId, 'after')
  const attend = await action(context.cookies.technician, ticketId, {
    action: 'attend',
    workDescription: 'Trabajo terminado',
    clientRequestId: randomUUID(),
  })
  expect(attend.statusCode).toBe(200)
}

async function openClaim(ticketId: string) {
  await evidence(ticketId, 'claim')
  const response = await action(context.cookies.requester, ticketId, {
    action: 'open_claim',
    reasonId: claimReasonId,
    description: 'La reparación no quedó bien',
    clientRequestId: randomUUID(),
  })
  expect(response.statusCode).toBe(200)
}

beforeAll(async () => {
  context = await buildTicketHttpApp()
  refs = await loadWriteRefs(context)
  const reason = await context.db.execute(sql`
    select id from public.reasons where use = 'claim' limit 1
  `)
  claimReasonId = (reason.rows[0] as { id: string }).id
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

describe('claims', () => {
  it('closes participation on claim and reopens the leader in the next cycle', async () => {
    const ticketId = await createTicket()
    await attendTicket(ticketId)
    await openClaim(ticketId)

    const openParticipants = await context.db.execute(sql`
      select count(*)::int as count
      from public.ticket_participants
      where ticket_id = ${ticketId} and ended_at is null
    `)
    expect((openParticipants.rows[0] as { count: number }).count).toBe(0)

    const resolve = await action(context.cookies.supervisor, ticketId, {
      action: 'resolve_claim',
      resolution: 'upheld',
      note: 'Procede la reclamación',
      clientRequestId: randomUUID(),
    })
    expect(resolve.statusCode).toBe(200)
    const ticket = await context.db.execute(sql`
      select status, cycle from public.tickets where id = ${ticketId}
    `)
    expect(ticket.rows[0]).toMatchObject({ status: 'assigned', cycle: 2 })

    const leaders = await context.db.execute(sql`
      select cycle, participation_type, ended_at
      from public.ticket_participants
      where ticket_id = ${ticketId} and technician_id = ${refs.technicianId}
      order by started_at
    `)
    expect(leaders.rows).toEqual([
      expect.objectContaining({ cycle: 1, ended_at: expect.any(String) }),
      expect.objectContaining({
        cycle: 2,
        participation_type: 'leader',
        ended_at: null,
      }),
    ])
  })

  it('ends the technician assignment when the claim is dismissed', async () => {
    const ticketId = await createTicket()
    await attendTicket(ticketId)
    await openClaim(ticketId)

    const resolve = await action(context.cookies.supervisor, ticketId, {
      action: 'resolve_claim',
      resolution: 'dismissed',
      note: 'La evidencia muestra que sí quedó bien',
      clientRequestId: randomUUID(),
    })
    expect(resolve.statusCode).toBe(200)
    const assignments = await context.db.execute(sql`
      select ended_at
      from public.ticket_assignments
      where ticket_id = ${ticketId}
        and stage = 'technician'
        and ended_at is null
    `)
    expect(assignments.rows).toEqual([])
  })
})

describe('derived tickets', () => {
  it('creates the derived ticket although the problem requires an attachment', async () => {
    const ticketId = await createTicket()
    await attendTicket(ticketId)
    await openClaim(ticketId)
    await context.db.execute(sql`
      update public.problems
      set attachment_required_types = array['application/pdf']::text[]
      where id = ${refs.problemId}
    `)
    try {
      const resolve = await action(context.cookies.supervisor, ticketId, {
        action: 'resolve_claim',
        resolution: 'new_ticket',
        note: 'Se genera un tiquet nuevo',
        clientRequestId: randomUUID(),
      })
      expect(resolve.statusCode).toBe(200)
      const derivedId = (resolve.json() as { derivedTicketId: string })
        .derivedTicketId
      const derived = await context.db.execute(sql`
        select problem_id from public.tickets where id = ${derivedId}
      `)
      expect(derived.rows[0]).toMatchObject({ problem_id: refs.problemId })
    } finally {
      await context.db.execute(sql`
        update public.problems
        set attachment_required_types = '{}'
        where id = ${refs.problemId}
      `)
    }
  })
})
