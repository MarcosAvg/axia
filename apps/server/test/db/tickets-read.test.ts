import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { getTicketDetail } from '../../src/tickets/detail.js'
import { listParticipants } from '../../src/tickets/participants.js'
import { listTickets } from '../../src/tickets/repository.js'
import { buildTicketFixtures, type TicketFixtures } from './tickets-fixtures.js'

let fixtures: TicketFixtures

beforeAll(async () => {
  fixtures = await buildTicketFixtures()
}, 60_000)

afterAll(async () => {
  await fixtures.pool.end()
})

describe('ticket detail', () => {
  it('returns the full detail for a visible ticket', async () => {
    const { db, actors, ids } = fixtures
    const ticket = await getTicketDetail(db, actors.admin, ids.ticketA1)

    expect(ticket).not.toBeNull()
    expect(ticket).toMatchObject({
      id: ids.ticketA1,
      status: 'registered',
      cycle: 1,
      closedAt: null,
      description: 'Fuga en el baño',
      locationName: 'Sala A1',
      dependencyName: 'Dependencia',
      requesterDependencyId: null,
      requesterDependencyName: null,
      categoryName: 'Categoría A',
      priorityName: 'Media',
      priorityPosition: 3,
      teamName: 'Equipo A',
    })
  })
})

describe('ticket detail cycle times', () => {
  it('returns the time of each cycle phase in minutes', async () => {
    const { db, actors, ids } = fixtures
    await db.execute(sql`
      update public.tickets set reported_at = '2026-01-01T00:00:00Z'
      where id = ${ids.ticketA1}
    `)
    await db.execute(sql`
      select public.rebuild_ticket_time_spans(${ids.ticketA1})
    `)
    await db.execute(sql`
      insert into public.ticket_events (
        ticket_id, cycle, type, actor_id, payload, occurred_at
      ) values
        (${ids.ticketA1}, 1, 'taken', ${actors.admin.id},
          '{}'::jsonb, '2026-01-01T01:00:00Z'),
        (${ids.ticketA1}, 1, 'assigned_technician', ${actors.admin.id},
          '{}'::jsonb, '2026-01-01T01:30:00Z'),
        (${ids.ticketA1}, 1, 'started', ${actors.admin.id},
          '{}'::jsonb, '2026-01-01T01:30:00Z'),
        (${ids.ticketA1}, 1, 'attended', ${actors.admin.id},
          '{}'::jsonb, '2026-01-01T02:30:00Z'),
        (${ids.ticketA1}, 1, 'validated', ${actors.admin.id},
          '{}'::jsonb, '2026-01-01T03:00:00Z')
    `)
    await db.execute(sql`
      update public.tickets
      set status = 'closed', closed_at = '2026-01-01T03:00:00Z'
      where id = ${ids.ticketA1}
    `)
    await db.execute(sql`
      select public.rebuild_ticket_time_spans(${ids.ticketA1})
    `)

    const ticket = await getTicketDetail(db, actors.admin, ids.ticketA1)

    expect(ticket?.cycleTimes.active).toBeCloseTo(60, 0)
    expect(ticket?.cycleTimes.response).toBeCloseTo(60, 0)
    expect(ticket?.cycleTimes.assignment).toBeCloseTo(30, 0)
    expect(ticket?.cycleTimes.validation).toBeCloseTo(30, 0)
    expect(ticket?.cycleTimes.total).toBeCloseTo(180, 0)
  })
})

describe('ticket detail scope', () => {
  it('returns null when the ticket is outside the actor scope', async () => {
    const { db, actors, ids } = fixtures
    expect(
      await getTicketDetail(db, actors.technician, ids.ticketB1),
    ).toBeNull()
    expect(
      await getTicketDetail(db, actors.supervisor, ids.ticketA2),
    ).toBeNull()
    expect(await getTicketDetail(db, actors.outsider, ids.ticketA1)).toBeNull()
  })
})

describe('ticket detail actor state', () => {
  it('marks the requester and validation state for the actor', async () => {
    const { db, actors, ids } = fixtures
    const asRequester = await getTicketDetail(
      db,
      actors.requester,
      ids.ticketA1,
    )
    expect(asRequester).toMatchObject({
      isRequester: true,
      requesterValidated: false,
      hasTaken: false,
    })

    const asAdmin = await getTicketDetail(db, actors.admin, ids.ticketA1)
    expect(asAdmin).toMatchObject({
      isRequester: false,
      requesterValidated: false,
      hasTaken: false,
    })
  })
})

describe('ticket list fields', () => {
  it('includes closedAt in the list item', async () => {
    const { db, actors, ids } = fixtures
    const page = await listTickets(db, actors.admin, {
      filters: {},
      page: 1,
      pageSize: 20,
    })
    const item = page.items.find((ticket) => ticket.id === ids.ticketA2)
    expect(item).toBeDefined()
    expect(item?.closedAt).toBeNull()
  })

  it('includes the requester, location and assigned technician', async () => {
    const { db, actors, ids } = fixtures
    const page = await listTickets(db, actors.admin, {
      filters: {},
      page: 1,
      pageSize: 20,
    })
    const item = page.items.find((ticket) => ticket.id === ids.ticketA1)
    expect(item).toMatchObject({
      requesterName: 'Solicitante',
      categoryName: 'Categoría A',
      locationName: 'Sala A1',
      technicianName: 'Técnico A',
    })
  })
})

async function listIds(filters: Parameters<typeof listTickets>[2]['filters']) {
  const page = await listTickets(fixtures.db, fixtures.actors.admin, {
    filters,
    page: 1,
    pageSize: 20,
  })
  return page.items.map((ticket) => ticket.id).sort()
}

describe('ticket list filters', () => {
  it('filtra por equipo, solicitante, técnico y dependencia', async () => {
    const { ids } = fixtures
    expect(await listIds({ teamId: fixtures.catalog.teamA.id })).toEqual(
      [ids.ticketA1, ids.ticketA2, ids.ticketAux].sort(),
    )
    expect(
      await listIds({ requesterId: fixtures.people.requesterRow.id }),
    ).toEqual([ids.ticketA1, ids.ticketA2].sort())
    expect(
      await listIds({ technicianId: fixtures.people.technicianRow.id }),
    ).toEqual([ids.ticketA1])
    expect(
      await listIds({ dependencyId: fixtures.catalog.dependency.id }),
    ).toHaveLength(4)
    expect(await listIds({ dependencyId: crypto.randomUUID() })).toEqual([])
  })

  it('filtra por categoría, prioridad y tipo de servicio', async () => {
    const { ids } = fixtures
    expect(
      await listIds({ categoryId: fixtures.catalog.categoryB.id }),
    ).toEqual([ids.ticketB1])
    expect(
      await listIds({ priorityId: fixtures.catalog.priority.id }),
    ).toHaveLength(4)
    expect(await listIds({ priorityId: crypto.randomUUID() })).toEqual([])
    expect(
      await listIds({ serviceTypeId: fixtures.catalog.serviceType.id }),
    ).toHaveLength(4)
    expect(await listIds({ serviceTypeId: crypto.randomUUID() })).toEqual([])
  })
})

describe('ticket list filter flags', () => {
  it('filtra por rango de fechas de registro', async () => {
    const today = new Date().toISOString().slice(0, 10)
    expect(await listIds({ from: '2000-01-01', to: today })).toHaveLength(4)
    expect(await listIds({ from: '2099-01-01' })).toEqual([])
  })

  it('filtra por tiquets sin ruteo y posibles duplicados', async () => {
    const { db, ids } = fixtures
    expect(await listIds({ unrouted: true })).toEqual(
      [ids.ticketA2, ids.ticketB1].sort(),
    )

    await db.execute(sql`
      update public.tickets set possible_duplicate = true
      where id = ${ids.ticketA2}
    `)
    try {
      expect(await listIds({ possibleDuplicate: true })).toEqual([ids.ticketA2])
    } finally {
      await db.execute(sql`
        update public.tickets set possible_duplicate = false
        where id = ${ids.ticketA2}
      `)
    }
  })
})

describe('ticket participants', () => {
  it('lists participants for a visible ticket', async () => {
    const { db, actors, ids } = fixtures
    const participants = await listParticipants(
      db,
      actors.technician,
      ids.ticketAux,
    )

    expect(participants).toHaveLength(1)
    expect(participants?.[0]).toMatchObject({
      technicianName: 'Técnico A',
      participationType: 'leader',
      endedAt: null,
    })
  })

  it('returns null when the ticket is outside the actor scope', async () => {
    const { db, actors, ids } = fixtures
    expect(
      await listParticipants(db, actors.requester, ids.ticketAux),
    ).toBeNull()
    expect(await listParticipants(db, actors.outsider, ids.ticketA1)).toBeNull()
  })
})
