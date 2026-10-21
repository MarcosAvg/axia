import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { can } from '../../src/tickets/access.js'
import { loadActor } from '../../src/auth/authorization.js'
import {
  assertTicketAction,
  findVisibleTicket,
  loadTicketAccess,
  getTimeline,
  listTickets,
} from '../../src/tickets/repository.js'
import { buildTicketFixtures, type TicketFixtures } from './tickets-fixtures.js'

let fixtures: TicketFixtures

beforeAll(async () => {
  fixtures = await buildTicketFixtures()
}, 60_000)

afterAll(async () => {
  await fixtures.pool.end()
})

describe('scoped ticket list', () => {
  it('limits each actor to the expected tickets', async () => {
    const { db, actors, ids } = fixtures
    const adminPage = await listTickets(db, actors.admin, {
      filters: {},
      page: 1,
      pageSize: 20,
    })
    expect(adminPage.total).toBe(4)

    const requesterPage = await listTickets(db, actors.requester, {
      filters: {},
      page: 1,
      pageSize: 20,
    })
    expect(requesterPage.items.map((item) => item.id).sort()).toEqual(
      [ids.ticketA1, ids.ticketA2].sort(),
    )

    const technicianPage = await listTickets(db, actors.technician, {
      filters: {},
      page: 1,
      pageSize: 20,
    })
    expect(technicianPage.items.map((item) => item.id).sort()).toEqual(
      [ids.ticketA1, ids.ticketAux].sort(),
    )

    const supervisorPage = await listTickets(db, actors.supervisor, {
      filters: {},
      page: 1,
      pageSize: 20,
    })
    expect(supervisorPage.items.map((item) => item.id).sort()).toEqual(
      [ids.ticketA1, ids.ticketAux].sort(),
    )

    const outsiderPage = await listTickets(db, actors.outsider, {
      filters: {},
      page: 1,
      pageSize: 20,
    })
    expect(outsiderPage.items).toEqual([])
    expect(outsiderPage.total).toBe(0)
  })
})

describe('team scope', () => {
  it('applies team scope across buildings', async () => {
    const { db, actors, ids } = fixtures
    await db.execute(sql`
      update public.role_permissions
      set scope = 'team'
      where role_id = (select id from public.roles where name = 'supervisor')
        and permission_id = 'ticket.view'
    `)

    try {
      const supervisor = await loadActor(db, actors.supervisor.id)
      expect(supervisor).not.toBeNull()
      if (!supervisor) return
      const page = await listTickets(db, supervisor, {
        filters: {},
        page: 1,
        pageSize: 20,
      })
      expect(page.items.map((item) => item.id).sort()).toEqual(
        [ids.ticketA1, ids.ticketA2, ids.ticketAux].sort(),
      )
    } finally {
      await db.execute(sql`
        update public.role_permissions
        set scope = 'buildings'
        where role_id = (select id from public.roles where name = 'supervisor')
          and permission_id = 'ticket.view'
      `)
    }
  })
})

describe('scope filters', () => {
  it('applies filters inside the scope', async () => {
    const { db, actors, ids } = fixtures
    const page = await listTickets(db, actors.supervisor, {
      filters: { search: 'Fuga' },
      page: 1,
      pageSize: 20,
    })
    expect(page.items.map((item) => item.id)).toEqual([ids.ticketA1])

    const page2 = await listTickets(db, actors.supervisor, {
      filters: { search: 'Aire' },
      page: 1,
      pageSize: 20,
    })
    expect(page2.items).toEqual([])
  })
})

describe('opaque ticket access', () => {
  it('returns null outside the actor scope', async () => {
    const { db, actors, ids } = fixtures
    expect(
      await findVisibleTicket(db, actors.supervisor, ids.ticketA2),
    ).toBeNull()
    expect(
      await findVisibleTicket(db, actors.technician, ids.ticketB1),
    ).toBeNull()
    expect(
      await findVisibleTicket(db, actors.outsider, ids.ticketA1),
    ).toBeNull()
  })

  it('returns the ticket inside the scope and enforces action permissions', async () => {
    const { db, actors, ids } = fixtures
    const access = await findVisibleTicket(db, actors.technician, ids.ticketA1)
    expect(access).not.toBeNull()
    if (!access) return

    expect(() =>
      assertTicketAction(actors.technician, 'ticket.start', access),
    ).not.toThrow()
    expect(() =>
      assertTicketAction(actors.supervisor, 'ticket.start', access),
    ).toThrow('No tienes permiso')
  })

  it('hides a team action when the ticket is outside the supervisor building scope', async () => {
    const { db, actors, ids } = fixtures
    expect(
      await findVisibleTicket(db, actors.supervisor, ids.ticketA2),
    ).toBeNull()
  })
})

describe('requester timeline', () => {
  it('filters internal events for the requester and not for staff', async () => {
    const { db, actors, ids } = fixtures
    expect(actors.requester.requesterUserId).not.toBeNull()
    const access = await loadTicketAccess(db, actors.requester, ids.ticketA1)
    expect(access?.requesterUserId).toBe(actors.requester.requesterUserId)
    expect(access && can(actors.requester, 'ticket.view', access)).toBe(true)
    const requesterTimeline = await getTimeline(
      db,
      actors.requester,
      ids.ticketA1,
    )
    expect(requesterTimeline?.map((event) => event.type)).toEqual(['created'])

    const adminTimeline = await getTimeline(db, actors.admin, ids.ticketA1)
    expect(adminTimeline?.map((event) => event.type)).toEqual([
      'created',
      'comment',
    ])
  })

  it('returns null for an invisible timeline', async () => {
    const { db, actors, ids } = fixtures
    expect(await getTimeline(db, actors.supervisor, ids.ticketA2)).toBeNull()
  })
})
