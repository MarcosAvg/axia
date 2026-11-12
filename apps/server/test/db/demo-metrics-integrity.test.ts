import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Client } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { loadActor } from '../../src/auth/authorization.js'
import { createDb } from '../../src/db/client.js'
import { ID } from '../../src/db/seed-demo/data.js'
import { seedDemo } from '../../src/db/seed-demo/index.js'
import { requesterTimes, technicianTimes } from '../../src/metrics/people.js'
import { byTechnician, pausesByReason } from '../../src/metrics/service.js'
import { ownerConnectionString, prepareTestDatabase } from './helpers.js'

const DEMO_PASSWORD = 'DemoPassword123!'

let owner: Client
let evidenceDir: string

async function scalar(sql: string): Promise<number> {
  const result = await owner.query<{ value: string }>(sql)
  return Number(result.rows[0]?.value ?? 0)
}

beforeAll(async () => {
  evidenceDir = await mkdtemp(join(tmpdir(), 'axia-demo-integrity-'))
  await prepareTestDatabase()
  owner = new Client({ connectionString: ownerConnectionString() })
  await owner.connect()
  await seedDemo(owner, { password: DEMO_PASSWORD, evidenceDir })
}, 120_000)

afterAll(async () => {
  await owner?.end()
  await rm(evidenceDir, { recursive: true, force: true })
})

describe('demo seed reassignment integrity', () => {
  it('keeps reassignment events, assignments and attributed work aligned', async () => {
    expect(
      await scalar(`
        select count(*)::text as value
        from public.ticket_events e
        join public.ticket_participants p
          on p.ticket_id = e.ticket_id and p.cycle = e.cycle
         and p.technician_id = e.subject_technician_id
        where e.type = 'reassigned_technician'
          and abs(extract(epoch from (e.occurred_at - p.started_at))) > 60
      `),
    ).toBe(0)
    expect(
      await scalar(`
        select count(*)::text as value
        from public.ticket_events e
        join public.ticket_events r
          on r.ticket_id = e.ticket_id and r.type = 'reassigned_technician'
        where e.cycle = 1 and e.type in ('started', 'attended')
          and e.subject_technician_id <> r.subject_technician_id
      `),
    ).toBe(0)
  })

  it('stores evidence in the cycle where it was captured', async () => {
    expect(
      await scalar(`
        select count(*)::text as value
        from public.evidence ev
        join public.tickets t on t.id = ev.ticket_id
        join public.ticket_events r
          on r.ticket_id = t.id and r.type = 'reopened'
        where ev.occurred_at >= r.occurred_at and ev.cycle <> 2
      `),
    ).toBe(0)
  })
})

describe('demo seed outcome integrity', () => {
  it('links supervisor reassignment, withdraws terminal offers and stores substates', async () => {
    expect(
      await scalar(`
        select count(*)::text as value from public.ticket_events e
        where e.type = 'reassigned_supervisor'
          and not exists (
            select 1 from public.ticket_assignments a
            where a.ticket_id = e.ticket_id
              and a.stage = 'supervisor'
              and a.reason_id = e.reason_id
              and abs(extract(epoch from (a.assigned_at - e.occurred_at))) <= 60
          )
      `),
    ).toBe(0)
    expect(
      await scalar(`
        select count(*)::text as value
        from public.tickets t
        join public.ticket_offers o on o.ticket_id = t.id
        where t.status in ('rejected', 'cancelled', 'duplicate')
          and o.status = 'offered'
      `),
    ).toBe(0)
    expect(
      await scalar(`
        select count(*)::text as value
        from public.ticket_pauses p
        join public.reasons r on r.id = p.reason_id
        where r.parent_id is null
      `),
    ).toBe(0)
  })

  it('feeds pause substates, claims and validations', async () => {
    expect(
      await scalar(`
        select count(distinct s.reason_id)::text as value
        from public.ticket_pause_steps s
        join public.reasons r on r.id = s.reason_id
        where r.parent_id is not null
      `),
    ).toBeGreaterThanOrEqual(4)
    expect(
      await scalar('select count(*)::text as value from public.ticket_claims'),
    ).toBeGreaterThanOrEqual(6)
    expect(
      await scalar(
        'select count(*)::text as value from public.ticket_validations',
      ),
    ).toBeGreaterThanOrEqual(300)
  })
})

describe('demo seed metrics service rows', () => {
  it('returns team, requester and pause rows', async () => {
    const { db, pool } = createDb(ownerConnectionString())
    try {
      const actor = await loadActor(db, ID.userAdmin)
      if (!actor) throw new Error('Demo administrator not found')
      expect(await byTechnician(db, actor, {})).toHaveLength(5)
      expect(await technicianTimes(db, actor, {})).toHaveLength(5)
      expect(await requesterTimes(db, actor, {})).toHaveLength(6)
      expect((await pausesByReason(db, actor, {})).length).toBeGreaterThan(4)
    } finally {
      await pool.end()
    }
  })
})
