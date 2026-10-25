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
let recaptureReason: string
let reassignReason: string
let pauseReason: string
let claimReason: string
let buildingB1: string
let locationB1: string
let categoryB: string
let teamB: string

function ticketBody() {
  return {
    buildingId: refs.buildingId,
    locationId: refs.locationId,
    dependencyId: refs.dependencyId,
    categoryId: refs.categoryId,
    serviceTypeId: refs.serviceTypeId,
    priorityId: refs.priorityId,
    channelId: refs.channelId,
    description: `Tiquet de ciclo ${randomUUID()}`,
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

async function addEvidence(
  ticketId: string,
  type: 'before' | 'after' | 'claim',
) {
  await context.db.execute(sql`
    insert into public.evidence (
      ticket_id, cycle, type, captured_by_technician_id, processing_state
    ) values (${ticketId}, 1, ${type}, ${refs.technicianId}, 'ready')
  `)
}

async function startTicket(ticketId: string) {
  await addEvidence(ticketId, 'before')
  const started = await action(context.cookies.technician, ticketId, {
    action: 'start',
    clientRequestId: randomUUID(),
  })
  expect(started.statusCode).toBe(200)
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
  recaptureReason = await createReason('recapture', 'Recaptura de ciclo')
  reassignReason = await createReason(
    'supervisor_reassignment',
    'Reasignación de ciclo',
  )
  pauseReason = await createReason('pause', 'Pausa de ciclo')
  claimReason = await createReason('claim', 'Reclamación de ciclo')
  const other = await context.db.execute(sql`
    select
      (select id from public.buildings where name = 'Edificio B1') as building_id,
      (select id from public.locations where name = 'Sala B1') as location_id,
      (select id from public.categories where name = 'Categoría B') as category_id,
      (select id from public.teams where name = 'Equipo B') as team_id
  `)
  const row = other.rows[0] as {
    building_id: string
    location_id: string
    category_id: string
    team_id: string
  }
  buildingB1 = row.building_id
  locationB1 = row.location_id
  categoryB = row.category_id
  teamB = row.team_id
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

describe('recapture', () => {
  it('applies the corrected building, category and location', async () => {
    const ticketId = await createTicket()
    const response = await action(context.cookies.supervisor, ticketId, {
      action: 'recapture',
      changes: {
        buildingId: buildingB1,
        locationId: locationB1,
        categoryId: categoryB,
        description: 'Captura corregida de ciclo',
      },
      reasonId: recaptureReason,
      clientRequestId: randomUUID(),
    })
    expect(response.statusCode).toBe(200)

    const ticket = await context.db.execute(sql`
      select status, team_id, building_id, location_id, category_id, description
      from public.tickets where id = ${ticketId}
    `)
    expect(ticket.rows[0]).toMatchObject({
      status: 'registered',
      team_id: teamB,
      building_id: buildingB1,
      location_id: locationB1,
      category_id: categoryB,
      description: 'Captura corregida de ciclo',
    })
    const offers = await context.db.execute(sql`
      select count(*)::int as count from public.ticket_offers
      where ticket_id = ${ticketId} and status = 'offered'
    `)
    expect((offers.rows[0] as { count: number }).count).toBe(0)
    const captures = await context.db.execute(sql`
      select changes from public.ticket_captures
      where ticket_id = ${ticketId}
    `)
    expect(captures.rows[0]).toMatchObject({
      changes: expect.objectContaining({
        buildingId: buildingB1,
        categoryId: categoryB,
        locationId: locationB1,
      }),
    })
  })

  it('rejects recapture after the work has started', async () => {
    const ticketId = await createTicket()
    await takeAndAssign(ticketId)
    await startTicket(ticketId)
    const response = await action(context.cookies.supervisor, ticketId, {
      action: 'recapture',
      changes: { description: 'Cambio tardío' },
      reasonId: recaptureReason,
      clientRequestId: randomUUID(),
    })
    expect(response.statusCode).toBe(409)
  })
})

describe('supervisor reassignment', () => {
  it('closes the pause and the technician work', async () => {
    const ticketId = await createTicket()
    await takeAndAssign(ticketId)
    await startTicket(ticketId)
    const paused = await action(context.cookies.supervisor, ticketId, {
      action: 'pause',
      reasonId: pauseReason,
      clientRequestId: randomUUID(),
    })
    expect(paused.statusCode).toBe(200)

    const response = await action(context.cookies.supervisor, ticketId, {
      action: 'assign_supervisor',
      reasonId: reassignReason,
      supervisorUserId: secondSupervisorUserId,
      note: 'Cambio de turno',
      clientRequestId: randomUUID(),
    })
    expect(response.statusCode).toBe(200)

    const ticket = await context.db.execute(sql`
      select status from public.tickets where id = ${ticketId}
    `)
    expect(ticket.rows[0]).toMatchObject({ status: 'with_supervisor' })
    const pause = await context.db.execute(sql`
      select closed_at from public.ticket_pauses
      where ticket_id = ${ticketId}
      order by opened_at desc
      limit 1
    `)
    expect(
      (pause.rows[0] as { closed_at: Date | null }).closed_at,
    ).not.toBeNull()
    const openSpans = await context.db.execute(sql`
      select count(*)::int as count from public.time_spans
      where ticket_id = ${ticketId}
        and kind in ('active_work', 'pause')
        and ended_at is null
    `)
    expect((openSpans.rows[0] as { count: number }).count).toBe(0)
    const technician = await context.db.execute(sql`
      select
        (select count(*)::int from public.ticket_assignments
          where ticket_id = ${ticketId} and stage = 'technician'
            and ended_at is null) as assignments,
        (select count(*)::int from public.ticket_participants
          where ticket_id = ${ticketId} and technician_id = ${refs.technicianId}
            and ended_at is null) as participants
    `)
    expect(technician.rows[0]).toMatchObject({
      assignments: 0,
      participants: 0,
    })
  })
})

describe('claim reopening', () => {
  it('clears the close date when the claim is upheld', async () => {
    const ticketId = await createTicket()
    await takeAndAssign(ticketId)
    await startTicket(ticketId)
    await addEvidence(ticketId, 'after')
    const attended = await action(context.cookies.technician, ticketId, {
      action: 'attend',
      workDescription: 'Trabajo terminado',
      clientRequestId: randomUUID(),
    })
    expect(attended.statusCode).toBe(200)
    await action(context.cookies.requester, ticketId, {
      action: 'validate',
      clientRequestId: randomUUID(),
    })
    await action(context.cookies.supervisor, ticketId, {
      action: 'validate',
      clientRequestId: randomUUID(),
    })
    const closed = await context.db.execute(sql`
      select status, closed_at from public.tickets where id = ${ticketId}
    `)
    expect(closed.rows[0]).toMatchObject({ status: 'closed' })
    expect(
      (closed.rows[0] as { closed_at: Date | null }).closed_at,
    ).not.toBeNull()

    await addEvidence(ticketId, 'claim')
    const open = await action(context.cookies.requester, ticketId, {
      action: 'open_claim',
      reasonId: claimReason,
      description: 'Volvió a fallar',
      clientRequestId: randomUUID(),
    })
    expect(open.statusCode).toBe(200)
    const resolve = await action(context.cookies.supervisor, ticketId, {
      action: 'resolve_claim',
      resolution: 'upheld',
      note: 'Procede',
      clientRequestId: randomUUID(),
    })
    expect(resolve.statusCode).toBe(200)

    const reopened = await context.db.execute(sql`
      select status, cycle, closed_at from public.tickets where id = ${ticketId}
    `)
    expect(reopened.rows[0]).toMatchObject({ status: 'assigned', cycle: 2 })
    expect(
      (reopened.rows[0] as { closed_at: Date | null }).closed_at,
    ).toBeNull()
  })
})
