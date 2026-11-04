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
  takeTicket,
  type WriteRefs,
} from './tickets-write-helpers.js'
import {
  addScopeOnlySupervisor,
  createRoutingTicket,
  idByUsername as lookupIdByUsername,
  reassignRoutingTicket,
  routingAction,
} from './tickets-routing-helpers.js'

let context: TicketHttpContext
let refs: WriteRefs
let reassignReason: string
let secondSupervisorId: string
let teamB: string
let buildingB1: string
let locationB1: string

const action = (
  cookie: string,
  ticketId: string,
  payload: Record<string, unknown>,
) => routingAction(context, cookie, ticketId, payload)

const createTicket = () => createRoutingTicket(context, refs)

const idByUsername = (username: string) => lookupIdByUsername(context, username)

const reassign = (
  cookie: string,
  ticketId: string,
  destination: { teamId?: string; supervisorUserId?: string },
) =>
  reassignRoutingTicket(context, {
    cookie,
    ticketId,
    reasonId: reassignReason,
    destination,
  })

beforeAll(async () => {
  context = await buildTicketHttpApp()
  refs = await loadWriteRefs(context)
  await addSecondSupervisor(context, refs)
  secondSupervisorId = await idByUsername('supervisor-a2')
  const reason = await context.db.execute(sql`
    insert into public.reasons (use, name)
    values ('supervisor_reassignment', 'Ruteo de prueba')
    returning id
  `)
  reassignReason = (reason.rows[0] as { id: string }).id
  const other = await context.db.execute(sql`
    select
      (select id from public.teams where name = 'Equipo B') as team_id,
      (select id from public.buildings where name = 'Edificio B1') as building_id,
      (select id from public.locations where name = 'Sala B1') as location_id
  `)
  const row = other.rows[0] as {
    team_id: string
    building_id: string
    location_id: string
  }
  teamB = row.team_id
  buildingB1 = row.building_id
  locationB1 = row.location_id
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

describe('ruteo tras reasignación', () => {
  it('registra el tiquet sin ruteo y avisa al administrador', async () => {
    const ticketId = await createTicket()
    await takeTicket(context, ticketId)

    const response = await reassign(context.cookies.supervisor, ticketId, {
      teamId: teamB,
    })
    expect(response.statusCode).toBe(200)

    const ticket = await context.db.execute(sql`
      select status from public.tickets where id = ${ticketId}
    `)
    expect(ticket.rows[0]).toMatchObject({ status: 'registered' })

    const offers = await context.db.execute(sql`
      select count(*)::int as count from public.ticket_offers
      where ticket_id = ${ticketId} and status = 'offered'
    `)
    expect((offers.rows[0] as { count: number }).count).toBe(0)

    const events = await context.db.execute(sql`
      select count(*)::int as count from public.ticket_events
      where ticket_id = ${ticketId} and type::text = 'unrouted'
    `)
    expect((events.rows[0] as { count: number }).count).toBe(1)

    const notifications = await context.db.execute(sql`
      select count(*)::int as count from public.notifications
      where ticket_id = ${ticketId} and type = 'unrouted'
    `)
    expect((notifications.rows[0] as { count: number }).count).toBeGreaterThan(
      0,
    )

    const detail = await context.app.inject({
      method: 'GET',
      url: `/api/tickets/${ticketId}`,
      headers: authHeaders(context.cookies.admin),
    })
    expect(detail.statusCode).toBe(200)
    expect(
      (detail.json() as { ticket: { isUnrouted: boolean } }).ticket.isUnrouted,
    ).toBe(true)

    const list = await context.app.inject({
      method: 'GET',
      url: '/api/tickets?status=registered',
      headers: authHeaders(context.cookies.admin),
    })
    expect(list.statusCode).toBe(200)
    const item = (
      list.json() as { items: Array<{ id: string; isUnrouted: boolean }> }
    ).items.find((row) => row.id === ticketId)
    expect(item?.isUnrouted).toBe(true)
  })
})

describe('visibilidad del ruteo', () => {
  it('oculta el estado de ruteo a quien no coordina', async () => {
    const ticketId = await createTicket()
    await takeTicket(context, ticketId)
    expect(
      (await reassign(context.cookies.supervisor, ticketId, { teamId: teamB }))
        .statusCode,
    ).toBe(200)

    const detail = await context.app.inject({
      method: 'GET',
      url: `/api/tickets/${ticketId}`,
      headers: authHeaders(context.cookies.requester),
    })
    expect(detail.statusCode).toBe(200)
    expect(
      (detail.json() as { ticket: { isUnrouted: boolean } }).ticket.isUnrouted,
    ).toBe(false)
  })
})

describe('reasignación administrativa', () => {
  it('permite al administrador reasignar y vuelve a ofertar al mismo supervisor', async () => {
    const ticketId = await createTicket()
    await takeTicket(context, ticketId)
    expect(
      (await reassign(context.cookies.supervisor, ticketId, { teamId: teamB }))
        .statusCode,
    ).toBe(200)

    const response = await reassign(context.cookies.admin, ticketId, {
      teamId: refs.teamId,
    })
    expect(response.statusCode).toBe(200)

    const supervisorId = await idByUsername('supervisor-access')
    const offers = await context.db.execute(sql`
      select supervisor_user_id, offer_round, status
      from public.ticket_offers
      where ticket_id = ${ticketId} and status = 'offered'
    `)
    const reopened = (
      offers.rows as Array<{
        supervisor_user_id: string
        offer_round: number
        status: string
      }>
    ).find((row) => row.supervisor_user_id === supervisorId)
    expect(reopened).toMatchObject({ offer_round: 2, status: 'offered' })

    const take = await action(context.cookies.supervisor, ticketId, {
      action: 'take',
      clientRequestId: randomUUID(),
    })
    expect(take.statusCode).toBe(200)
  })
})

describe('destino sin permisos', () => {
  it('no oferta el tiquet a un supervisor que no puede tomar', async () => {
    const userId = await addScopeOnlySupervisor(context, refs, 'sin-permisos')
    const ticketId = await createTicket()
    const offers = await context.db.execute(sql`
      select count(*)::int as count from public.ticket_offers
      where ticket_id = ${ticketId} and supervisor_user_id = ${userId}
    `)
    expect((offers.rows[0] as { count: number }).count).toBe(0)
    await context.db.execute(sql`
      delete from public.users where id = ${userId}
    `)
  })

  it('rechaza un destino que no puede continuar el tiquet', async () => {
    const ticketId = await createTicket()
    await takeTicket(context, ticketId)
    const userId = await addScopeOnlySupervisor(context, refs, 'sin-permisos')
    const response = await reassign(context.cookies.supervisor, ticketId, {
      supervisorUserId: userId,
    })
    expect(response.statusCode).toBe(400)
    await context.db.execute(sql`
      delete from public.users where id = ${userId}
    `)
  })
})

describe('recaptura hacia un equipo sin candidatos', () => {
  it('deja la marca de sin ruteo', async () => {
    const ticketId = await createTicket()
    await takeTicket(context, ticketId)
    const recaptureReason = await context.db.execute(sql`
      insert into public.reasons (use, name)
      values ('recapture', 'Recaptura de ruteo')
      returning id
    `)
    const reasonId = (recaptureReason.rows[0] as { id: string }).id
    const response = await action(context.cookies.supervisor, ticketId, {
      action: 'recapture',
      reasonId,
      changes: {
        buildingId: buildingB1,
        locationId: locationB1,
        categoryId: refs.categoryIdB,
        subcategoryId: refs.subcategoryIdB,
        problemId: refs.problemIdB,
        description: 'Captura corregida hacia equipo B',
      },
      clientRequestId: randomUUID(),
    })
    expect(response.statusCode).toBe(200)

    const event = await context.db.execute(sql`
      select count(*)::int as count from public.ticket_events
      where ticket_id = ${ticketId} and type::text = 'unrouted'
    `)
    expect((event.rows[0] as { count: number }).count).toBe(1)
  })
})

describe('liberación al desactivar al supervisor', () => {
  it('devuelve el tiquet a ruteo y oferta a otro candidato', async () => {
    const ticketId = await createTicket()
    await takeTicket(context, ticketId)
    const supervisorId = await idByUsername('supervisor-access')

    const deactivated = await context.app.inject({
      method: 'PATCH',
      url: `/api/admin/users/${supervisorId}`,
      headers: authHeaders(context.cookies.admin),
      payload: { active: false },
    })
    expect(deactivated.statusCode).toBe(200)

    const ticket = await context.db.execute(sql`
      select status from public.tickets where id = ${ticketId}
    `)
    expect(ticket.rows[0]).toMatchObject({ status: 'registered' })

    const assignment = await context.db.execute(sql`
      select count(*)::int as count from public.ticket_assignments
      where ticket_id = ${ticketId}
        and stage = 'supervisor'
        and assignee_user_id = ${supervisorId}
        and ended_at is null
    `)
    expect((assignment.rows[0] as { count: number }).count).toBe(0)

    const offers = await context.db.execute(sql`
      select supervisor_user_id from public.ticket_offers
      where ticket_id = ${ticketId} and status = 'offered'
    `)
    expect(offers.rows).toEqual([
      expect.objectContaining({ supervisor_user_id: secondSupervisorId }),
    ])

    await context.db.execute(sql`
      update public.users set active = true where id = ${supervisorId}
    `)
  })
})
