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
      categoryName: 'Categoría A',
      priorityName: 'Media',
      priorityPosition: 3,
      teamName: 'Equipo A',
    })
  })

  it('returns the time of each cycle phase in minutes', async () => {
    const { db, actors, ids } = fixtures
    await db.execute(sql`
      update public.tickets set reported_at = now() - interval '3 hours'
      where id = ${ids.ticketA1}
    `)
    await db.execute(sql`
      insert into public.time_spans (ticket_id, cycle, kind, started_at, ended_at)
      values (
        ${ids.ticketA1}, 1, 'active_work',
        now() - interval '90 minutes', now() - interval '30 minutes'
      )
    `)

    const ticket = await getTicketDetail(db, actors.admin, ids.ticketA1)

    expect(ticket?.cycleTimes.active).toBeCloseTo(60, 0)
    expect(ticket?.cycleTimes.response).toBe(0)
    expect(ticket?.cycleTimes.total).toBeCloseTo(180, 0)
  })

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

describe('ticket list fields', () => {
  it('includes closedAt in the list item', async () => {
    const { db, actors, ids } = fixtures
    const page = await listTickets(db, actors.admin, {
      filters: {},
      page: 1,
      pageSize: 20,
    })
    const item = page.items.find((ticket) => ticket.id === ids.ticketA1)
    expect(item).toBeDefined()
    expect(item?.closedAt).toBeNull()
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
