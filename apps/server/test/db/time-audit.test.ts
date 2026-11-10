import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it } from 'vitest'

import { auditTime } from '../../src/maintenance/time-audit.js'
import { buildTicketFixtures, type TicketFixtures } from './tickets-fixtures.js'

let fixtures: TicketFixtures

async function seedCoverageIssue() {
  const { db, ids } = fixtures
  // Mover el registro sin reconstruir los tramos deja un hueco de cobertura.
  await db.execute(sql`
    update public.tickets
    set reported_at = now() - interval '2 hours'
    where id = ${ids.ticketA2}
  `)
}

async function seedNegativeDurations() {
  const { db, ids, people, catalog } = fixtures
  await db.execute(sql`
    insert into public.ticket_participants (
      ticket_id, cycle, technician_id, participation_type, category_id,
      started_at, ended_at
    ) values (
      ${ids.ticketA1}, 1, ${people.technicianRow.id}, 'auxiliary',
      ${catalog.categoryA.id}, now(), now() - interval '1 hour'
    )
  `)
  await db.execute(sql`
    update public.ticket_assignments
    set ended_at = assigned_at - interval '1 hour'
    where ticket_id = ${ids.ticketA1} and stage = 'technician'
  `)
}

async function pauseReasonId(): Promise<string> {
  const result = await fixtures.db.execute(sql`
    select id from public.reasons
    where use = 'pause' and parent_id is null
    limit 1
  `)
  return (result.rows[0] as { id: string }).id
}

async function seedPauseIssues(reasonId: string) {
  const { db, ids } = fixtures
  const pause = await db.execute(sql`
    insert into public.ticket_pauses (
      ticket_id, cycle, reason_id, root_reason_id, opened_at, closed_at
    ) values (
      ${ids.ticketAux}, 1, ${reasonId}, ${reasonId},
      now(), now() - interval '1 hour'
    )
    returning id
  `)
  const pauseId = (pause.rows[0] as { id: string }).id
  await db.execute(sql`
    insert into public.ticket_pause_steps (
      pause_id, reason_id, entered_at, exited_at
    ) values (
      ${pauseId}, ${reasonId}, now(), now() - interval '1 hour'
    )
  `)
  await db.execute(sql`
    insert into public.time_spans (
      ticket_id, cycle, kind, ref_id, started_at, ended_at
    ) values (
      ${ids.ticketAux}, 1, 'pause', ${reasonId},
      now() - interval '3 hours', now() - interval '2 hours'
    )
  `)
}

async function seedEventIssues() {
  const { db, ids, people } = fixtures
  await db.execute(sql`
    insert into public.ticket_events (
      ticket_id, cycle, type, actor_id, occurred_at, recorded_at
    ) values (
      ${ids.ticketA1}, 1, 'comment', ${people.adminId},
      now() - interval '3 hours', now()
    )
  `)
}

async function seedEvidenceCycleMismatch() {
  const { db, ids, people } = fixtures
  await db.execute(sql`
    update public.tickets set cycle = 2 where id = ${ids.ticketB1}
  `)
  await db.execute(sql`
    insert into public.ticket_events (
      ticket_id, cycle, type, actor_id, payload, occurred_at
    ) values (
      ${ids.ticketB1}, 2, 'reopened', ${people.adminId}, '{}'::jsonb,
      now() - interval '1 hour'
    )
  `)
  await db.execute(sql`
    insert into public.evidence (
      ticket_id, cycle, type, occurred_at, created_at, processing_state
    ) values (
      ${ids.ticketB1}, 1, 'other', now(), now(), 'ready'
    )
  `)
}

beforeAll(async () => {
  fixtures = await buildTicketFixtures()
  const reasonId = await pauseReasonId()
  await seedCoverageIssue()
  await seedNegativeDurations()
  await seedPauseIssues(reasonId)
  await seedEventIssues()
  await seedEvidenceCycleMismatch()
}, 60_000)

afterAll(async () => {
  await fixtures.pool.end()
})

it('reporta los problemas de tiempo con conteo y ejemplos acotados', async () => {
  const report = await auditTime(fixtures.db, { limit: 2 })
  const byKey = new Map(
    report.findings.map((finding) => [finding.key, finding]),
  )

  for (const key of [
    'coverage_delta',
    'negative_participant',
    'negative_pause',
    'negative_pause_step',
    'negative_assignment',
    'event_out_of_bounds',
    'event_drift',
    'pause_span_vs_table',
    'evidence_cycle_mismatch',
  ]) {
    const finding = byKey.get(key)
    expect(finding, key).toBeDefined()
    expect(finding?.count, key).toBeGreaterThan(0)
    expect(finding?.samples.length, key).toBeLessThanOrEqual(2)
  }

  expect(byKey.get('unverified_events')).toMatchObject({
    count: 0,
    available: false,
  })
  expect(byKey.get('open_time_alerts')).toMatchObject({
    count: 0,
    available: false,
  })
})

it('ordena los hallazgos y declara el total', async () => {
  const report = await auditTime(fixtures.db, { limit: 1 })
  const keys = report.findings.map((finding) => finding.key)
  expect(keys).toEqual([...keys].sort())
  expect(report.totalFindings).toBe(
    report.findings.reduce((sum, finding) => sum + finding.count, 0),
  )
  expect(report.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
})
