import type { InjectOptions } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  authHeaders,
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'

let context: TicketHttpContext

function call(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  cookie: string,
  payload?: Record<string, unknown>,
) {
  const options: InjectOptions = {
    method,
    url,
    headers: authHeaders(cookie),
    ...(payload === undefined ? {} : { payload }),
  }
  return context.app.inject(options)
}

beforeAll(async () => {
  context = await buildTicketHttpApp()
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

describe('auth identity and profile', () => {
  it('returns the actor identity in camelCase and updates the profile', async () => {
    const me = await call('GET', '/api/auth/me', context.cookies.admin)
    expect(me.statusCode).toBe(200)
    expect(me.json()).toMatchObject({
      user: {
        username: 'admin-access',
        timezone: 'America/Mexico_City',
        roles: ['administrator'],
      },
    })

    const updated = await call(
      'PATCH',
      '/api/auth/profile',
      context.cookies.admin,
      {
        fullName: 'Administrador E2E',
        phone: 'ext. 9',
      },
    )
    expect(updated.statusCode).toBe(200)
    expect(updated.json()).toMatchObject({
      user: { fullName: 'Administrador E2E', phone: 'ext. 9' },
    })
  })
})

describe('admin access and catalogs', () => {
  it('lists access data and creates a role', async () => {
    const access = await call('GET', '/api/admin/access', context.cookies.admin)
    expect(access.statusCode).toBe(200)
    expect(access.json()).toMatchObject({
      roles: expect.any(Array),
      profiles: expect.any(Array),
      scopes: expect.any(Array),
    })

    const role = await call(
      'POST',
      '/api/admin/access/roles',
      context.cookies.admin,
      {
        name: `rol_e2e_${crypto.randomUUID().slice(0, 8)}`,
        label: 'Rol E2E',
      },
    )
    expect(role.statusCode).toBe(204)
  })

  it('creates and lists an admin catalog row', async () => {
    const name = `Equipo cierre ${crypto.randomUUID().slice(0, 8)}`
    const created = await call(
      'POST',
      '/api/admin/catalogs/teams',
      context.cookies.admin,
      { name, active: true },
    )
    expect(created.statusCode).toBe(201)
    const list = await call(
      'GET',
      '/api/admin/catalogs/teams?orderBy=name',
      context.cookies.admin,
    )
    expect(list.statusCode).toBe(200)
    expect((list.json() as { items: Array<{ name: string }> }).items).toEqual(
      expect.arrayContaining([expect.objectContaining({ name })]),
    )
  })

  it('rejects non-admin access to catalogs', async () => {
    const response = await call(
      'GET',
      '/api/admin/catalogs/teams',
      context.cookies.technician,
    )
    expect(response.statusCode).toBe(403)
  })
})

describe('calendars and settings', () => {
  it('reads calendars and instance settings', async () => {
    const calendars = await call(
      'GET',
      '/api/admin/calendars',
      context.cookies.admin,
    )
    expect(calendars.statusCode).toBe(200)
    expect(calendars.json()).toMatchObject({ items: expect.any(Array) })

    const settings = await call(
      'GET',
      '/api/admin/settings',
      context.cookies.admin,
    )
    expect(settings.statusCode).toBe(200)
    expect(settings.json()).toMatchObject({
      settings: { timezone: 'America/Mexico_City' },
    })
  })
})

describe('ticket extras', () => {
  it('returns pause state, rating and manual time with scope', async () => {
    const id = context.ids.ticketA1
    expect(
      (
        await call(
          'GET',
          `/api/tickets/${id}/pause-state`,
          context.cookies.admin,
        )
      ).statusCode,
    ).toBe(200)
    expect(
      (await call('GET', `/api/tickets/${id}/rating`, context.cookies.admin))
        .statusCode,
    ).toBe(200)
    expect(
      (
        await call(
          'GET',
          `/api/tickets/${id}/manual-time`,
          context.cookies.admin,
        )
      ).statusCode,
    ).toBe(200)
    expect(
      (
        await call(
          'GET',
          `/api/tickets/${id}/pause-state`,
          context.cookies.outsider,
        )
      ).statusCode,
    ).toBe(404)
  })
})

describe('manual time and duplicates', () => {
  it('records and voids a manual time span', async () => {
    const id = context.ids.ticketA1
    const now = new Date()
    const startedAt = new Date(now.getTime() - 3600_000).toISOString()
    const endedAt = now.toISOString()
    const recorded = await call(
      'POST',
      `/api/tickets/${id}/manual-time`,
      context.cookies.admin,
      {
        kind: 'active_work',
        clockClass: 'counted',
        startedAt,
        endedAt,
        clientRequestId: crypto.randomUUID(),
      },
    )
    expect(recorded.statusCode).toBe(204)
    const list = await call(
      'GET',
      `/api/tickets/${id}/manual-time`,
      context.cookies.admin,
    )
    const item = (list.json() as { items: Array<{ id: string }> }).items[0]
    expect(item).toBeDefined()
    const voided = await call(
      'POST',
      `/api/tickets/${id}/manual-time/${item?.id}/void`,
      context.cookies.admin,
    )
    expect(voided.statusCode).toBe(204)
  })
})

describe('duplicate check', () => {
  it('checks duplicates for a ticket creation', async () => {
    const id = context.ids.ticketA1
    const detail = await call(
      'GET',
      `/api/tickets/${id}`,
      context.cookies.admin,
    )
    const ticket = (
      detail.json() as {
        ticket: {
          buildingId: string
          categoryId: string
          problemId: string | null
          description: string
        }
      }
    ).ticket
    const duplicates = await call(
      'POST',
      '/api/tickets/duplicates',
      context.cookies.admin,
      {
        buildingId: ticket.buildingId,
        categoryId: ticket.categoryId,
        problemId: ticket.problemId ?? undefined,
        description: ticket.description,
      },
    )
    expect(duplicates.statusCode).toBe(200)
    expect(duplicates.json()).toMatchObject({ items: expect.any(Array) })
  })
})

describe('metrics', () => {
  it('returns scoped tickets and aggregates', async () => {
    const tickets = await call(
      'GET',
      '/api/metrics/tickets',
      context.cookies.admin,
    )
    expect(tickets.statusCode).toBe(200)
    expect(tickets.json()).toMatchObject({ items: expect.any(Array) })

    const sla = await call('GET', '/api/metrics/sla', context.cookies.admin)
    expect(sla.statusCode).toBe(200)
    expect(sla.json()).toMatchObject({ items: expect.any(Array) })
  })
})
