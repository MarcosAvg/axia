import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

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

async function coverage(ticketId: string) {
  const result = await fixtures.db.execute(sql`
    select total_time, phase_time, delta
    from public.v_ticket_phase_coverage
    where id = ${ticketId}
  `)
  return result.rows[0] as {
    total_time: string
    phase_time: string
    delta: string
  }
}

describe('ticket phase coverage', () => {
  it('covers the whole life of a normally closed ticket', async () => {
    const { db, ids } = fixtures
    await db.execute(sql`
      update public.tickets
      set reported_at = '2026-01-01T00:00:00Z'
      where id = ${ids.ticketA2}
    `)
    await db.execute(sql`
      select public.rebuild_ticket_time_spans(${ids.ticketA2})
    `)

    await event(ids.ticketA2, 'taken', '2026-01-01T01:00:00Z')
    await event(ids.ticketA2, 'assigned_technician', '2026-01-01T01:30:00Z')
    await event(ids.ticketA2, 'started', '2026-01-01T01:30:00Z')
    await event(ids.ticketA2, 'attended', '2026-01-01T02:30:00Z')
    await event(ids.ticketA2, 'validated', '2026-01-01T03:00:00Z')

    await db.execute(sql`
      update public.tickets
      set status = 'closed', closed_at = '2026-01-01T03:00:00Z'
      where id = ${ids.ticketA2}
    `)
    await db.execute(sql`
      select public.rebuild_ticket_time_spans(${ids.ticketA2})
    `)

    const result = await coverage(ids.ticketA2)
    expect(result.total_time).toBe('03:00:00')
    expect(result.delta).toBe('00:00:00')
  })

  it('covers a cancelled ticket until its close date', async () => {
    const { db, ids } = fixtures
    await db.execute(sql`
      update public.tickets
      set reported_at = '2026-02-01T00:00:00Z'
      where id = ${ids.ticketAux}
    `)
    await db.execute(sql`
      select public.rebuild_ticket_time_spans(${ids.ticketAux})
    `)
    await event(ids.ticketAux, 'cancelled', '2026-02-01T01:00:00Z')
    await db.execute(sql`
      update public.tickets
      set status = 'cancelled', closed_at = '2026-02-01T01:00:00Z'
      where id = ${ids.ticketAux}
    `)
    await db.execute(sql`
      select public.rebuild_ticket_time_spans(${ids.ticketAux})
    `)

    const result = await coverage(ids.ticketAux)
    expect(result.delta).toBe('00:00:00')
  })

  it('covers a duplicate review without counting it as a phase', async () => {
    const { db, ids } = fixtures
    await db.execute(sql`
      update public.tickets
      set reported_at = '2026-03-01T00:00:00Z'
      where id = ${ids.ticketB1}
    `)
    await db.execute(sql`
      select public.rebuild_ticket_time_spans(${ids.ticketB1})
    `)
    await event(ids.ticketB1, 'duplicate_marked', '2026-03-01T01:00:00Z')
    await db.execute(sql`
      update public.tickets
      set status = 'duplicate', closed_at = '2026-03-01T01:00:00Z'
      where id = ${ids.ticketB1}
    `)
    await db.execute(sql`
      select public.rebuild_ticket_time_spans(${ids.ticketB1})
    `)

    const result = await coverage(ids.ticketB1)
    expect(result.delta).toBe('00:00:00')
  })

  it('forbids two open primary phases on the same ticket', async () => {
    const { db, ids } = fixtures
    await expect(
      db.execute(sql`
        insert into public.time_spans (ticket_id, cycle, kind, started_at)
        values (${ids.ticketA1}, 1, 'active_work', now())
      `),
    ).rejects.toThrow()
  })
})
