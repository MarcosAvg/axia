import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  authHeaders,
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'
import {
  addSecondSupervisor,
  loadWriteRefs,
  type WriteRefs,
} from './tickets-write-helpers.js'

let context: TicketHttpContext
let refs: WriteRefs
let secondSupervisor: string
let auxiliaryTechnicianId: string
let secondLeaderId: string
let auxiliaryReasonId: string
let reassignmentReasonId: string
let recaptureReasonId: string

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
    description: `Tiquet de asignación ${randomUUID()}`,
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

async function take(ticketId: string) {
  const response = await action(context.cookies.supervisor, ticketId, {
    action: 'take',
    clientRequestId: randomUUID(),
  })
  expect(response.statusCode).toBe(200)
}

async function assign(ticketId: string, technicianId = refs.technicianId) {
  const response = await action(context.cookies.supervisor, ticketId, {
    action: 'assign_technician',
    technicianId,
    clientRequestId: randomUUID(),
  })
  expect(response.statusCode).toBe(200)
}

async function addAuxiliary(ticketId: string) {
  const response = await action(context.cookies.supervisor, ticketId, {
    action: 'add_auxiliary',
    technicianId: auxiliaryTechnicianId,
    reasonId: auxiliaryReasonId,
    clientRequestId: randomUUID(),
  })
  expect(response.statusCode).toBe(200)
}

async function statusOf(ticketId: string): Promise<string> {
  const result = await context.db.execute(sql`
    select status from public.tickets where id = ${ticketId}
  `)
  return (result.rows[0] as { status: string }).status
}

async function participant(
  ticketId: string,
  technicianId: string,
): Promise<{ participation_type: string; ended_at: string | null }> {
  const result = await context.db.execute(sql`
    select participation_type, ended_at
    from public.ticket_participants
    where ticket_id = ${ticketId} and technician_id = ${technicianId}
    order by started_at
    limit 1
  `)
  return result.rows[0] as {
    participation_type: string
    ended_at: string | null
  }
}

beforeAll(async () => {
  context = await buildTicketHttpApp()
  refs = await loadWriteRefs(context)
  secondSupervisor = await addSecondSupervisor(context, refs)

  const auxiliary = await context.db.execute(sql`
    select id from public.technicians where full_name = 'Técnico B'
  `)
  auxiliaryTechnicianId = (auxiliary.rows[0] as { id: string }).id

  const leader = await context.db.execute(sql`
    insert into public.technicians (full_name, team_id)
    values ('Técnico C', ${refs.teamId})
    returning id
  `)
  secondLeaderId = (leader.rows[0] as { id: string }).id
  await context.db.execute(sql`
    insert into public.technician_categories (technician_id, category_id)
    values (${secondLeaderId}, ${refs.categoryId})
  `)

  const reasons = await context.db.execute(sql`
    select
      (select id from public.reasons
        where use = 'auxiliary_support' limit 1) as auxiliary,
      (select id from public.reasons
        where use = 'technician_reassignment' limit 1) as reassignment,
      (select id from public.reasons
        where use = 'recapture' limit 1) as recapture
  `)
  const reasonRow = reasons.rows[0] as {
    auxiliary: string
    reassignment: string
    recapture: string
  }
  auxiliaryReasonId = reasonRow.auxiliary
  reassignmentReasonId = reasonRow.reassignment
  recaptureReasonId = reasonRow.recapture
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

describe('assignment rules', () => {
  it('adds a non-designated technician as auxiliary only with a reason', async () => {
    const ticketId = await createTicket()
    await take(ticketId)

    const withoutReason = await action(context.cookies.supervisor, ticketId, {
      action: 'assign_technician',
      technicianId: auxiliaryTechnicianId,
      clientRequestId: randomUUID(),
    })
    expect(withoutReason.statusCode).toBe(400)

    const withReason = await action(context.cookies.supervisor, ticketId, {
      action: 'assign_technician',
      technicianId: auxiliaryTechnicianId,
      reasonId: auxiliaryReasonId,
      clientRequestId: randomUUID(),
    })
    expect(withReason.statusCode).toBe(200)
    expect(await statusOf(ticketId)).toBe('with_supervisor')
    const assignments = await context.db.execute(sql`
      select count(*)::int as count
      from public.ticket_assignments
      where ticket_id = ${ticketId} and stage = 'technician'
    `)
    expect((assignments.rows[0] as { count: number }).count).toBe(0)
    expect(await participant(ticketId, auxiliaryTechnicianId)).toMatchObject({
      participation_type: 'auxiliary',
      ended_at: null,
    })

    await assign(ticketId)
    expect(await statusOf(ticketId)).toBe('assigned')
    expect(await participant(ticketId, auxiliaryTechnicianId)).toMatchObject({
      participation_type: 'auxiliary',
      ended_at: null,
    })
  })
})

describe('leader reassignment', () => {
  it('requires a reason to replace the leader and keeps auxiliaries', async () => {
    const ticketId = await createTicket()
    await take(ticketId)
    await assign(ticketId)
    await addAuxiliary(ticketId)

    const withoutReason = await action(context.cookies.supervisor, ticketId, {
      action: 'assign_technician',
      technicianId: secondLeaderId,
      clientRequestId: randomUUID(),
    })
    expect(withoutReason.statusCode).toBe(400)

    const reassigned = await action(context.cookies.supervisor, ticketId, {
      action: 'assign_technician',
      technicianId: secondLeaderId,
      reasonId: reassignmentReasonId,
      clientRequestId: randomUUID(),
    })
    expect(reassigned.statusCode).toBe(200)
    expect(await statusOf(ticketId)).toBe('assigned')

    const leaders = await context.db.execute(sql`
      select assignee_technician_id, ended_at
      from public.ticket_assignments
      where ticket_id = ${ticketId} and stage = 'technician'
      order by assigned_at
    `)
    expect(leaders.rows).toEqual([
      expect.objectContaining({
        assignee_technician_id: refs.technicianId,
        ended_at: expect.any(String),
      }),
      expect.objectContaining({
        assignee_technician_id: secondLeaderId,
        ended_at: null,
      }),
    ])
    expect(await participant(ticketId, auxiliaryTechnicianId)).toMatchObject({
      participation_type: 'auxiliary',
      ended_at: null,
    })
  })
})

describe('reassignment in progress', () => {
  it('allows reassignment while in progress and returns to assigned', async () => {
    const ticketId = await createTicket()
    await take(ticketId)
    await assign(ticketId)
    await context.db.execute(sql`
      insert into public.evidence (
        ticket_id, cycle, type, captured_by_technician_id, processing_state
      ) values (${ticketId}, 1, 'before', ${refs.technicianId}, 'ready')
    `)
    const start = await action(context.cookies.technician, ticketId, {
      action: 'start',
      clientRequestId: randomUUID(),
    })
    expect(start.statusCode).toBe(200)
    expect(await statusOf(ticketId)).toBe('in_progress')

    const reassigned = await action(context.cookies.supervisor, ticketId, {
      action: 'assign_technician',
      technicianId: secondLeaderId,
      reasonId: reassignmentReasonId,
      clientRequestId: randomUUID(),
    })
    expect(reassigned.statusCode).toBe(200)
    expect(await statusOf(ticketId)).toBe('assigned')

    const openWork = await context.db.execute(sql`
      select count(*)::int as count
      from public.time_spans
      where ticket_id = ${ticketId}
        and kind = 'active_work'
        and ended_at is null
    `)
    expect((openWork.rows[0] as { count: number }).count).toBe(0)
  })
})

describe('assignment holder', () => {
  it('rejects assignment and auxiliary support from a non-holder supervisor', async () => {
    const ticketId = await createTicket()
    await take(ticketId)

    const assignResponse = await action(secondSupervisor, ticketId, {
      action: 'assign_technician',
      technicianId: refs.technicianId,
      clientRequestId: randomUUID(),
    })
    expect(assignResponse.statusCode).toBe(403)

    const auxiliaryResponse = await action(secondSupervisor, ticketId, {
      action: 'add_auxiliary',
      technicianId: auxiliaryTechnicianId,
      reasonId: auxiliaryReasonId,
      clientRequestId: randomUUID(),
    })
    expect(auxiliaryResponse.statusCode).toBe(403)

    const recaptureResponse = await action(secondSupervisor, ticketId, {
      action: 'recapture',
      changes: { description: 'Recaptura sin titularidad' },
      reasonId: recaptureReasonId,
      clientRequestId: randomUUID(),
    })
    expect(recaptureResponse.statusCode).toBe(403)
  })
})
