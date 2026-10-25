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
let secondSupervisorUserId: string
let auxiliaryTechnicianId: string
let recaptureReason: string
let claimReason: string
let reassignReason: string
let auxiliaryReason: string

function ticketBody() {
  return {
    buildingId: refs.buildingId,
    locationId: refs.locationId,
    dependencyId: refs.dependencyId,
    categoryId: refs.categoryId,
    serviceTypeId: refs.serviceTypeId,
    priorityId: refs.priorityId,
    channelId: refs.channelId,
    description: `Tiquet avanzado ${randomUUID()}`,
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

async function createTicket() {
  const response = await context.app.inject({
    method: 'POST',
    url: '/api/tickets',
    headers: authHeaders(context.cookies.requester),
    payload: ticketBody(),
  })
  expect(response.statusCode).toBe(201)
  return (response.json() as { ticket: { id: string } }).ticket.id
}

async function takeAndAssign(ticketId: string) {
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
}

async function createReason(use: string, name: string): Promise<string> {
  const result = await context.db.execute(sql`
    insert into public.reasons (use, name) values (${use}, ${name}) returning id
  `)
  return (result.rows[0] as { id: string }).id
}

beforeAll(async () => {
  context = await buildTicketHttpApp()
  refs = await loadWriteRefs(context)
  await addSecondSupervisor(context, refs)
  const second = await context.db.execute(sql`
    select id from public.users where username = 'supervisor-a2'
  `)
  secondSupervisorUserId = (second.rows[0] as { id: string }).id
  const auxiliary = await context.db.execute(sql`
    select id from public.technicians where full_name = 'Técnico B'
  `)
  auxiliaryTechnicianId = (auxiliary.rows[0] as { id: string }).id
  recaptureReason = await createReason('recapture', 'Recaptura de prueba')
  claimReason = await createReason('claim', 'Reclamación de prueba')
  reassignReason = await createReason(
    'supervisor_reassignment',
    'Reasignación de prueba',
  )
  auxiliaryReason = await createReason('auxiliary_support', 'Apoyo de prueba')
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

describe('recapture and auxiliary support', () => {
  it('recaptures the ticket and records the version', async () => {
    const ticketId = await createTicket()
    const response = await action(context.cookies.supervisor, ticketId, {
      action: 'recapture',
      changes: { description: 'Descripción corregida' },
      reasonId: recaptureReason,
      clientRequestId: randomUUID(),
    })
    expect(response.statusCode).toBe(200)

    const ticket = await context.db.execute(sql`
      select description from public.tickets where id = ${ticketId}
    `)
    expect((ticket.rows[0] as { description: string }).description).toBe(
      'Descripción corregida',
    )
    const captures = await context.db.execute(sql`
      select count(*)::int as count from public.ticket_captures
      where ticket_id = ${ticketId}
    `)
    expect((captures.rows[0] as { count: number }).count).toBe(1)
  })

  it('adds an auxiliary technician', async () => {
    const ticketId = await createTicket()
    await takeAndAssign(ticketId)
    const response = await action(context.cookies.supervisor, ticketId, {
      action: 'add_auxiliary',
      technicianId: auxiliaryTechnicianId,
      reasonId: auxiliaryReason,
      note: 'Apoyo en sitio',
      clientRequestId: randomUUID(),
    })
    expect(response.statusCode).toBe(200)

    const participant = await context.db.execute(sql`
      select participation_type, ended_at
      from public.ticket_participants
      where ticket_id = ${ticketId} and technician_id = ${auxiliaryTechnicianId}
    `)
    expect(participant.rows[0]).toMatchObject({
      participation_type: 'auxiliary',
      ended_at: null,
    })
  })
})

describe('implicit take', () => {
  it('records the take when a supervisor assigns from registered', async () => {
    const ticketId = await createTicket()
    const response = await action(context.cookies.supervisor, ticketId, {
      action: 'assign_technician',
      technicianId: refs.technicianId,
      clientRequestId: randomUUID(),
    })
    expect(response.statusCode).toBe(200)
    const events = await context.db.execute(sql`
      select type from public.ticket_events
      where ticket_id = ${ticketId}
      order by id
    `)
    expect(events.rows.map((row) => (row as { type: string }).type)).toEqual(
      expect.arrayContaining(['taken', 'assigned_technician']),
    )
    const assignment = await context.db.execute(sql`
      select count(*)::int as count from public.ticket_assignments
      where ticket_id = ${ticketId} and stage = 'supervisor' and ended_at is null
    `)
    expect((assignment.rows[0] as { count: number }).count).toBe(1)
  })
})

describe('claims and supervisor reassignment', () => {
  it('opens and dismisses a claim', async () => {
    const ticketId = await createTicket()
    await takeAndAssign(ticketId)
    await context.db.execute(sql`
      insert into public.evidence (
        ticket_id, cycle, type, captured_by_technician_id, processing_state
      ) values (${ticketId}, 1, 'before', ${refs.technicianId}, 'ready')
    `)
    await action(context.cookies.technician, ticketId, {
      action: 'start',
      clientRequestId: randomUUID(),
    })
    await context.db.execute(sql`
      insert into public.evidence (
        ticket_id, cycle, type, captured_by_technician_id, processing_state
      ) values (${ticketId}, 1, 'after', ${refs.technicianId}, 'ready')
    `)
    await action(context.cookies.technician, ticketId, {
      action: 'attend',
      workDescription: 'Trabajo terminado',
      clientRequestId: randomUUID(),
    })
    await context.db.execute(sql`
      insert into public.evidence (
        ticket_id, cycle, type, captured_by_technician_id, processing_state
      ) values (${ticketId}, 1, 'claim', ${refs.technicianId}, 'ready')
    `)

    const open = await action(context.cookies.requester, ticketId, {
      action: 'open_claim',
      reasonId: claimReason,
      description: 'La reparación no quedó bien',
      clientRequestId: randomUUID(),
    })
    expect(open.statusCode).toBe(200)
    const underClaim = await context.db.execute(sql`
      select status from public.tickets where id = ${ticketId}
    `)
    expect((underClaim.rows[0] as { status: string }).status).toBe(
      'under_claim',
    )

    const resolve = await action(context.cookies.supervisor, ticketId, {
      action: 'resolve_claim',
      resolution: 'dismissed',
      note: 'La evidencia muestra que sí quedó bien',
      clientRequestId: randomUUID(),
    })
    expect(resolve.statusCode).toBe(200)
    const closed = await context.db.execute(sql`
      select status from public.tickets where id = ${ticketId}
    `)
    expect((closed.rows[0] as { status: string }).status).toBe('closed')
  })
})

describe('rating', () => {
  it('rates a closed ticket', async () => {
    const ticketId = await createTicket()
    await context.db.execute(sql`
      update public.tickets set status = 'closed', closed_at = now()
      where id = ${ticketId}
    `)
    const rating = await action(context.cookies.requester, ticketId, {
      action: 'rate',
      score: 5,
      comment: 'Quedó bien',
      clientRequestId: randomUUID(),
    })
    expect(rating.statusCode).toBe(200)
    const rated = await context.db.execute(sql`
      select score from public.ticket_ratings where ticket_id = ${ticketId}
    `)
    expect(rated.rows[0]).toMatchObject({ score: 5 })
  })
})

describe('supervisor reassignment', () => {
  it('reassigns the ticket to another supervisor', async () => {
    const ticketId = await createTicket()
    const take = await action(context.cookies.supervisor, ticketId, {
      action: 'take',
      clientRequestId: randomUUID(),
    })
    expect(take.statusCode).toBe(200)
    const response = await action(context.cookies.supervisor, ticketId, {
      action: 'assign_supervisor',
      reasonId: reassignReason,
      supervisorUserId: secondSupervisorUserId,
      note: 'Cambio de turno',
      clientRequestId: randomUUID(),
    })
    expect(response.statusCode).toBe(200)

    const assignment = await context.db.execute(sql`
      select assignee_user_id, ended_at
      from public.ticket_assignments
      where ticket_id = ${ticketId} and stage = 'supervisor'
        and ended_at is null
    `)
    expect(assignment.rows[0]).toMatchObject({
      assignee_user_id: secondSupervisorUserId,
      ended_at: null,
    })
  })
})
