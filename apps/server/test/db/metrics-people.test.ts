import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it } from 'vitest'

import {
  authHeaders,
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'

let context: TicketHttpContext

beforeAll(async () => {
  context = await buildTicketHttpApp()
}, 60_000)

afterAll(async () => closeTicketHttpApp(context))

async function items(
  metric: string,
  cookie = context.cookies.admin,
): Promise<Record<string, unknown>[]> {
  const response = await context.app.inject({
    method: 'GET',
    url: `/api/metrics/${metric}`,
    headers: authHeaders(cookie),
  })
  expect(response.statusCode).toBe(200)
  return (response.json() as { items: Record<string, unknown>[] }).items
}

it('promedia una vez cada tiquet liderado con hora verificada', async () => {
  const { db, ids, people } = context
  await db.execute(sql`
    update public.tickets t
    set reported_at = '2026-01-02 10:00Z', status = 'closed',
      closed_at = '2026-01-02 10:00Z'::timestamptz + fixture.duration
    from (values
      (${ids.ticketA1}::uuid, interval '60 min'),
      (${ids.ticketA2}::uuid, interval '180 min'),
      (${ids.ticketB1}::uuid, interval '300 min')
    ) as fixture(id, duration)
    where t.id = fixture.id
  `)
  await db.execute(sql`
    with technician as (
      insert into public.technicians (full_name, team_id)
      select 'Líder de prueba de promedios', team_id
      from public.tickets where id = ${ids.ticketA1}
      returning id
    )
    insert into public.ticket_participants (
      ticket_id, cycle, technician_id, participation_type, started_at, ended_at
    )
    select fixture.ticket, fixture.cycle, technician.id, 'leader',
      '2026-01-02 10:00Z', '2026-01-02 10:30Z'
    from technician cross join (values
      (${ids.ticketA1}::uuid, 1), (${ids.ticketA1}::uuid, 2),
      (${ids.ticketA2}::uuid, 1), (${ids.ticketB1}::uuid, 1)
    ) as fixture(ticket, cycle)
  `)
  await db.execute(sql`
    insert into public.ticket_events (
      ticket_id, cycle, type, actor_id, occurred_at, time_confidence
    ) values (
      ${ids.ticketB1}, 1, 'comment', ${people.adminId},
      '2026-01-02 11:00Z', 'unverified'
    )
  `)

  await db.execute(sql`
    insert into public.time_spans (ticket_id, cycle, kind, started_at, ended_at)
    values (${ids.ticketA2}, 1, 'validation', '2026-01-02 12:00Z', '2026-01-02 12:20Z')
  `)

  const row = (await items('technician-times')).find(
    (item) => item.technician_name === 'Líder de prueba de promedios',
  )
  expect(Number(row?.tickets)).toBe(2)
  expect(Number(row?.avg_total)).toBe(120)
  expect(Number(row?.avg_validation)).toBe(10)
})

it('cuenta solo tiquets que aportan a la validación o reclamación del solicitante', async () => {
  const { db, ids } = context
  await db.execute(sql`
    insert into public.time_spans (
      ticket_id, cycle, kind, subject_requester_id, started_at, ended_at
    )
    select fixture.ticket, 1, fixture.kind, t.requester_id, fixture.start_at,
      fixture.start_at + fixture.duration
    from public.tickets t cross join (values
      (${ids.ticketA1}::uuid, 'validation'::public.time_span_kind, '2026-01-02 10:00Z'::timestamptz, interval '10 min'),
      (${ids.ticketA2}::uuid, 'validation', '2026-01-02 10:00Z', interval '20 min'),
      (${ids.ticketA2}::uuid, 'claim', '2026-01-02 10:30Z', interval '40 min'),
      (${ids.ticketAux}::uuid, 'active_work', '2026-01-02 10:00Z', interval '60 min')
    ) as fixture(ticket, kind, start_at, duration)
    where t.id = ${ids.ticketA1}
  `)

  const rows = await items('requester-times')
  expect(rows).toEqual([
    expect.objectContaining({
      tickets: 2,
      validation_time: '00:30:00',
      claim_time: '00:40:00',
    }),
  ])
})

it('cuenta reasignaciones solo para el supervisor destino, incluso si no recibió ofertas', async () => {
  const { db, ids, people } = context
  await db.execute(sql`
    insert into public.ticket_events (
      ticket_id, cycle, type, actor_id, subject_user_id
    )
    select fixture.id, 1, 'reassigned_supervisor', ${people.supervisorUserId}, u.id
    from public.users u cross join (values
      (${ids.ticketA1}::uuid), (${ids.ticketA1}::uuid), (${ids.ticketB1}::uuid)
    ) as fixture(id)
    where u.username = 'other-supervisor'
  `)
  await db.execute(sql`
    insert into public.ticket_events (ticket_id, cycle, type, actor_id, payload)
    values (${ids.ticketA2}, 1, 'reassigned_supervisor', ${people.supervisorUserId},
      jsonb_build_object('toTeam', (select team_id from public.tickets where id = ${ids.ticketA2})))
  `)

  const rows = await items('supervisors')
  expect(rows).toEqual([
    expect.objectContaining({
      supervisor_id: people.supervisorUserId,
      offers: 1,
      reassigned: 0,
    }),
    expect.objectContaining({
      supervisor_name: 'Otro supervisor',
      offers: 0,
      reassigned: 2,
    }),
  ])
  const scoped = await items('supervisors', context.cookies.supervisor)
  expect(
    scoped.find((row) => row.supervisor_name === 'Otro supervisor'),
  ).toMatchObject({ offers: 0, reassigned: 1 })
})
