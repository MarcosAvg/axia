import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'

let context: TicketHttpContext
let baseUrl: string

async function get(path: string, cookie: string) {
  return fetch(`${baseUrl}${path}`, {
    headers: { Cookie: cookie },
  })
}

beforeAll(async () => {
  context = await buildTicketHttpApp()
  baseUrl = await context.app.listen({ host: '127.0.0.1', port: 0 })
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

describe('notifications', () => {
  it('lists, counts and marks in-app notifications', async () => {
    await context.db.execute(sql`
      insert into public.ticket_events (
        ticket_id, cycle, type, actor_id, payload, client_request_id
      ) values (
        ${context.ids.ticketA1}, 1, 'assigned_technician', null, '{}'::jsonb,
        ${randomUUID()}
      )
    `)

    const list = await get('/api/notifications', context.cookies.technician)
    expect(list.status).toBe(200)
    const body = (await list.json()) as {
      items: Array<{ id: string; type: string; ticketFolio: string | null }>
      unread: number
    }
    expect(body.items.some((item) => item.type === 'assigned_technician')).toBe(
      true,
    )
    expect(
      body.items.find((item) => item.type === 'assigned_technician')
        ?.ticketFolio,
    ).toBeTruthy()
    expect(body.unread).toBeGreaterThanOrEqual(1)
    const notificationId = body.items.find(
      (item) => item.type === 'assigned_technician',
    )?.id
    expect(notificationId).toBeTruthy()

    const read = await fetch(
      `${baseUrl}/api/notifications/${notificationId}/read`,
      {
        method: 'POST',
        headers: { Cookie: context.cookies.technician, Origin: baseUrl },
      },
    )
    expect(read.status).toBe(204)

    const count = await get(
      '/api/notifications/unread-count',
      context.cookies.technician,
    )
    expect((await count.json()) as { count: number }).toMatchObject({
      count: 0,
    })
  })

  it('does not show notifications to another actor', async () => {
    const response = await get('/api/notifications', context.cookies.noAccess)
    expect(response.status).toBe(403)
  })
})

describe('notification enrichment', () => {
  it('describes the aviso with actor, reason and ticket context', async () => {
    const reasons = await context.db.execute(sql`
      select id, name from public.reasons order by name limit 1
    `)
    const reason = reasons.rows[0] as { id: string; name: string }

    await context.db.execute(sql`
      insert into public.ticket_events (
        ticket_id, cycle, type, actor_id, reason_id, payload, client_request_id
      ) values (
        ${context.ids.ticketA1}, 1, 'reassigned_supervisor',
        (select id from public.users where username = 'admin-access'),
        ${reason.id},
        '{"note":"Cobertura temporal"}'::jsonb,
        ${randomUUID()}
      )
    `)

    const list = await get('/api/notifications', context.cookies.supervisor)
    expect(list.status).toBe(200)
    const body = (await list.json()) as {
      items: Array<{
        type: string
        actorName: string | null
        reasonName: string | null
        context: {
          teamName: string | null
          buildingName: string | null
          categoryName: string | null
          priorityName: string | null
        }
      }>
    }
    const item = body.items.find(
      (entry) => entry.type === 'reassigned_supervisor',
    )
    expect(item).toMatchObject({
      actorName: 'admin-access',
      reasonName: reason.name,
      context: {
        teamName: 'Equipo A',
        buildingName: 'Edificio A1',
        categoryName: 'Categoría A',
        priorityName: 'Media',
      },
    })
  })
})

describe('notification delivery rules', () => {
  it('does not notify the actor about their own action', async () => {
    const inserted = await context.db.execute(sql`
      insert into public.ticket_events (
        ticket_id, cycle, type, actor_id, payload, client_request_id
      ) values (
        ${context.ids.ticketA1}, 1, 'reassigned_supervisor',
        (select id from public.users where username = 'supervisor-access'),
        '{}'::jsonb, ${randomUUID()}
      ) returning id
    `)
    const eventId = (inserted.rows[0] as { id: string }).id
    const notifications = await context.db.execute(sql`
      select count(*)::int as count
      from public.notifications
      where event_id = ${eventId}
    `)
    expect((notifications.rows[0] as { count: number }).count).toBe(0)
  })

  it('notifies the added auxiliary through the subject technician', async () => {
    const people = await context.db.execute(sql`
      select t.id as technician_id, t.user_id
      from public.technicians t
      join public.users u on u.id = t.user_id
      where u.username = 'technician-access'
    `)
    const technician = people.rows[0] as {
      technician_id: string
      user_id: string
    }
    const inserted = await context.db.execute(sql`
      insert into public.ticket_events (
        ticket_id, cycle, type, actor_id, subject_technician_id, payload,
        client_request_id
      ) values (
        ${context.ids.ticketA1}, 1, 'auxiliary_added',
        (select id from public.users where username = 'supervisor-access'),
        ${technician.technician_id},
        ${JSON.stringify({ technicianId: technician.technician_id })}::jsonb,
        ${randomUUID()}
      ) returning id
    `)
    const eventId = (inserted.rows[0] as { id: string }).id
    const notifications = await context.db.execute(sql`
      select count(*)::int as count
      from public.notifications
      where event_id = ${eventId}
        and recipient_user_id = ${technician.user_id}
        and type = 'auxiliary_added'
    `)
    expect((notifications.rows[0] as { count: number }).count).toBe(1)
  })
})

describe('notification rule catalog', () => {
  it('activates the approved recipients for each event', async () => {
    const result = await context.db.execute(sql`
      select event_type, recipient
      from public.notification_rules
      where active
        and event_type in (
          'auxiliary_added', 'attended', 'capture_recaptured',
          'claim_resolved', 'priority_changed', 'rated', 'reactivated',
          'reassigned_supervisor', 'reassigned_technician', 'reopened',
          'validated'
        )
      order by event_type, recipient
    `)
    const rules = (
      result.rows as Array<{
        event_type: string
        recipient: string
      }>
    )
      .map((row) => `${row.event_type}:${row.recipient}`)
      .sort()
    expect(rules).toEqual([
      'attended:requester',
      'attended:supervisor',
      'auxiliary_added:subject_technician',
      'capture_recaptured:assigned_technician',
      'capture_recaptured:supervisor',
      'claim_resolved:assigned_technician',
      'claim_resolved:requester',
      'priority_changed:assigned_technician',
      'priority_changed:supervisor',
      'rated:assigned_technician',
      'reactivated:requester',
      'reassigned_supervisor:supervisor',
      'reassigned_technician:assigned_technician',
      'reopened:requester',
      'reopened:supervisor',
      'validated:assigned_technician',
      'validated:supervisor',
    ])
  })
})

describe('attention counts', () => {
  it('returns pending offers and active work for the actor', async () => {
    const supervisor = await get(
      '/api/tickets/attention',
      context.cookies.supervisor,
    )
    expect(supervisor.status).toBe(200)
    expect(await supervisor.json()).toEqual({ offers: 1, myWork: 0 })

    const technician = await get(
      '/api/tickets/attention',
      context.cookies.technician,
    )
    expect(technician.status).toBe(200)
    expect(await technician.json()).toEqual({ offers: 0, myWork: 1 })

    const requester = await get(
      '/api/tickets/attention',
      context.cookies.requester,
    )
    expect(requester.status).toBe(200)
    expect(await requester.json()).toEqual({ offers: 0, myWork: 0 })
  })

  it('requires ticket.view', async () => {
    const response = await get(
      '/api/tickets/attention',
      context.cookies.noAccess,
    )
    expect(response.status).toBe(403)
  })
})
