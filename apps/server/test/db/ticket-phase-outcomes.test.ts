import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it } from 'vitest'

import { buildTicketFixtures, type TicketFixtures } from './tickets-fixtures.js'

let fixtures: TicketFixtures

beforeAll(async () => {
  fixtures = await buildTicketFixtures()
}, 60_000)

afterAll(async () => {
  await fixtures.pool.end()
})

async function event(
  ticketId: string,
  type: string,
  occurredAt: string,
  extra: { reasonId?: string; payload?: string } = {},
) {
  const { db, actors } = fixtures
  await db.execute(sql`
    insert into public.ticket_events (
      ticket_id, cycle, type, actor_id, reason_id, payload, occurred_at
    ) values (
      ${ticketId}, 1, ${type}::public.event_type, ${actors.admin.id},
      ${extra.reasonId ?? null}, ${extra.payload ?? '{}'}::jsonb,
      ${occurredAt}::timestamptz
    )
  `)
}

async function createTicketCopy(sourceId: string) {
  const result = await fixtures.db.execute(sql`
    insert into public.tickets (
      team_id, building_id, location_id, dependency_id, category_id,
      service_type_id, priority_id, channel_id, description,
      requester_id, requester_name
    )
    select team_id, building_id, location_id, dependency_id, category_id,
      service_type_id, priority_id, channel_id, 'Cobertura',
      requester_id, requester_name
    from public.tickets where id = ${sourceId}
    returning id
  `)
  return (result.rows[0] as { id: string }).id
}

async function coverage(ticketId: string) {
  const result = await fixtures.db.execute(sql`
    select delta from public.v_ticket_phase_coverage where id = ${ticketId}
  `)
  return result.rows[0] as { delta: string }
}

it('covers a direct assignment without a taken event', async () => {
  const { db, ids } = fixtures
  const ticketId = await createTicketCopy(ids.ticketA2)
  await db.execute(sql`
    update public.tickets
    set reported_at = '2026-05-01T00:00:00Z'
    where id = ${ticketId}
  `)
  await db.execute(sql`select public.rebuild_ticket_time_spans(${ticketId})`)
  await event(ticketId, 'assigned_technician', '2026-05-01T02:00:00Z')
  await event(ticketId, 'cancelled', '2026-05-01T03:00:00Z')
  await db.execute(sql`
    update public.tickets
    set status = 'cancelled', closed_at = '2026-05-01T03:00:00Z'
    where id = ${ticketId}
  `)
  await db.execute(sql`select public.rebuild_ticket_time_spans(${ticketId})`)

  expect((await coverage(ticketId)).delta).toBe('00:00:00')
})

it('covers the gap between a discard and its reactivation', async () => {
  const { db, ids } = fixtures
  const ticketId = await createTicketCopy(ids.ticketA2)
  await db.execute(sql`
    update public.tickets
    set reported_at = '2026-06-01T00:00:00Z'
    where id = ${ticketId}
  `)
  await db.execute(sql`select public.rebuild_ticket_time_spans(${ticketId})`)
  await event(ticketId, 'cancelled', '2026-06-01T01:00:00Z')
  await db.execute(sql`
    update public.tickets
    set status = 'cancelled', closed_at = '2026-06-01T01:00:00Z'
    where id = ${ticketId}
  `)
  await db.execute(sql`select public.rebuild_ticket_time_spans(${ticketId})`)
  await event(ticketId, 'reactivated', '2026-06-01T02:00:00Z', {
    payload: '{"to":"assigned"}',
  })
  await db.execute(sql`
    update public.tickets
    set status = 'assigned', closed_at = null
    where id = ${ticketId}
  `)
  await db.execute(sql`select public.rebuild_ticket_time_spans(${ticketId})`)

  expect((await coverage(ticketId)).delta).toBe('00:00:00')
})

it('covers a claim opened after the ticket was closed', async () => {
  const { db, ids } = fixtures
  const ticketId = await createTicketCopy(ids.ticketA2)
  await db.execute(sql`
    update public.tickets
    set reported_at = '2026-07-01T00:00:00Z'
    where id = ${ticketId}
  `)
  await db.execute(sql`select public.rebuild_ticket_time_spans(${ticketId})`)
  await event(ticketId, 'taken', '2026-07-01T00:10:00Z')
  await event(ticketId, 'assigned_technician', '2026-07-01T00:20:00Z')
  await event(ticketId, 'started', '2026-07-01T00:30:00Z')
  await event(ticketId, 'attended', '2026-07-01T00:40:00Z')
  await event(ticketId, 'validated', '2026-07-01T00:50:00Z')
  await db.execute(sql`
    update public.tickets
    set status = 'closed', closed_at = '2026-07-01T00:50:00Z'
    where id = ${ticketId}
  `)
  await db.execute(sql`select public.rebuild_ticket_time_spans(${ticketId})`)
  await event(ticketId, 'claim_opened', '2026-07-01T01:30:00Z')
  await db.execute(sql`
    update public.tickets
    set status = 'under_claim', closed_at = null
    where id = ${ticketId}
  `)
  await db.execute(sql`select public.rebuild_ticket_time_spans(${ticketId})`)

  expect((await coverage(ticketId)).delta).toBe('00:00:00')
})

it('extends the last phase when closed_at is later than the last event', async () => {
  const { db, ids } = fixtures
  const ticketId = await createTicketCopy(ids.ticketA2)
  await db.execute(sql`
    update public.tickets
    set reported_at = '2026-08-01T00:00:00Z'
    where id = ${ticketId}
  `)
  await db.execute(sql`select public.rebuild_ticket_time_spans(${ticketId})`)
  await event(ticketId, 'taken', '2026-08-01T00:10:00Z')
  await event(ticketId, 'assigned_technician', '2026-08-01T00:20:00Z')
  await event(ticketId, 'started', '2026-08-01T00:30:00Z')
  await event(ticketId, 'attended', '2026-08-01T00:40:00Z')
  await event(ticketId, 'validated', '2026-08-01T01:00:00Z')
  await db.execute(sql`
    update public.tickets
    set status = 'closed', closed_at = '2026-08-01T02:00:00Z'
    where id = ${ticketId}
  `)
  await db.execute(sql`select public.rebuild_ticket_time_spans(${ticketId})`)

  expect((await coverage(ticketId)).delta).toBe('00:00:00')
})

it('mantiene la clasificación del intervalo al reanudar con otro motivo', async () => {
  const { db, ids } = fixtures
  const counted = await db.execute(sql`
    insert into public.reasons (use, name, clock_class)
    values ('pause', 'Pausa contada E2E', 'counted')
    returning id
  `)
  const notCounted = await db.execute(sql`
    insert into public.reasons (use, name, clock_class)
    values ('pause', 'Pausa no contada E2E', 'not_counted')
    returning id
  `)
  const ticketId = await createTicketCopy(ids.ticketA2)
  await db.execute(sql`
    update public.tickets
    set reported_at = '2026-09-01T00:00:00Z'
    where id = ${ticketId}
  `)
  await db.execute(sql`select public.rebuild_ticket_time_spans(${ticketId})`)
  await event(ticketId, 'started', '2026-09-01T00:10:00Z')
  await event(ticketId, 'paused', '2026-09-01T00:20:00Z', {
    reasonId: String(counted.rows[0]?.id),
  })
  await event(ticketId, 'resumed', '2026-09-01T00:30:00Z', {
    reasonId: String(notCounted.rows[0]?.id),
  })
  await event(ticketId, 'validated', '2026-09-01T01:00:00Z')
  await db.execute(sql`
    update public.tickets
    set status = 'closed', closed_at = '2026-09-01T01:00:00Z'
    where id = ${ticketId}
  `)
  await db.execute(sql`select public.rebuild_ticket_time_spans(${ticketId})`)

  const result = await db.execute(sql`
    select
      extract(epoch from public.ticket_time_total(${ticketId})) / 60 as total,
      extract(epoch from public.ticket_time_net(${ticketId})) / 60 as net
  `)
  const row = result.rows[0] as { total: string; net: string }
  expect(Number(row.total)).toBeCloseTo(60, 0)
  expect(Number(row.net)).toBeCloseTo(60, 0)

  const pauseSpan = await db.execute(sql`
    select ref_id, clock_class from public.time_spans
    where ticket_id = ${ticketId} and kind = 'pause'
  `)
  expect(pauseSpan.rows[0]).toMatchObject({
    ref_id: counted.rows[0]?.id,
    clock_class: 'counted',
  })
})
