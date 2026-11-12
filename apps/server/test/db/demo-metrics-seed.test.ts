import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Client } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { seedDemo } from '../../src/db/seed-demo/index.js'
import { ownerConnectionString, prepareTestDatabase } from './helpers.js'

const DEMO_PASSWORD = 'DemoPassword123!'
const CURATED_TICKETS = [
  'de000000-0000-4000-8000-000000000001',
  'de000000-0000-4000-8000-000000000002',
  'de000000-0000-4000-8000-000000000003',
  'de000000-0000-4000-8000-000000000004',
  'de000000-0000-4000-8000-000000000005',
  'de000000-0000-4000-8000-000000000006',
]

let owner: Client
let evidenceDir: string

async function scalar(sql: string): Promise<number> {
  const result = await owner.query<{ value: string }>(sql)
  return Number(result.rows[0]?.value ?? 0)
}

beforeAll(async () => {
  evidenceDir = await mkdtemp(join(tmpdir(), 'axia-demo-metrics-'))
  await prepareTestDatabase()
  owner = new Client({ connectionString: ownerConnectionString() })
  await owner.connect()
  await seedDemo(owner, { password: DEMO_PASSWORD, evidenceDir })
}, 120_000)

afterAll(async () => {
  await owner?.end()
  await rm(evidenceDir, { recursive: true, force: true })
})

describe('demo seed metrics volume', () => {
  it('generates enough volume to fill a year of monthly metrics', async () => {
    expect(
      await scalar('select count(*)::text as value from public.tickets'),
    ).toBe(240)
    expect(
      await scalar(`
        select count(distinct date_trunc('month', reported_at))::text as value
        from public.tickets
      `),
    ).toBeGreaterThanOrEqual(12)
  })

  it('covers every stable state and aging bucket', async () => {
    const statuses = await owner.query<{ status: string }>(
      'select distinct status::text from public.tickets order by 1',
    )
    expect(statuses.rows.map((row) => row.status)).toEqual([
      'assigned',
      'attended',
      'cancelled',
      'closed',
      'duplicate',
      'in_progress',
      'paused',
      'registered',
      'rejected',
      'under_claim',
      'with_supervisor',
    ])
    const buckets = await owner.query<{ bucket: string }>(`
      select distinct bucket from (
        select case
          when extract(epoch from (now() - reported_at)) <= 86400 then '0-1'
          when extract(epoch from (now() - reported_at)) <= 259200 then '2-3'
          when extract(epoch from (now() - reported_at)) <= 604800 then '4-7'
          when extract(epoch from (now() - reported_at)) <= 1209600 then '8-14'
          when extract(epoch from (now() - reported_at)) <= 2592000 then '15-30'
          else '30+'
        end as bucket
        from public.tickets
        where status in (
          'registered', 'with_supervisor', 'assigned', 'in_progress',
          'paused', 'attended', 'under_claim'
        )
      ) aged
      order by bucket
    `)
    expect(buckets.rows.map((row) => row.bucket)).toEqual([
      '0-1',
      '15-30',
      '2-3',
      '30+',
      '4-7',
      '8-14',
    ])
  })
})

describe('demo seed metrics quality', () => {
  it('feeds satisfaction, SLA and time quality indicators', async () => {
    expect(
      await scalar('select count(*)::text as value from public.ticket_ratings'),
    ).toBeGreaterThanOrEqual(80)
    expect(
      await scalar(
        'select count(distinct score)::text as value from public.ticket_ratings',
      ),
    ).toBe(5)

    const sla = await owner.query<{ met: number; missed: number }>(`
      select
        count(*) filter (where meets)::int as met,
        count(*) filter (where not meets)::int as missed
      from public.v_ticket_sla
      where closed_at is not null and target_minutes is not null
    `)
    expect(sla.rows[0]?.met ?? 0).toBeGreaterThan(0)
    expect(sla.rows[0]?.missed ?? 0).toBeGreaterThan(0)

    expect(
      await scalar('select count(*)::text as value from public.ticket_pauses'),
    ).toBeGreaterThanOrEqual(15)
    expect(
      await scalar(
        'select count(distinct reason_id)::text as value from public.ticket_pauses',
      ),
    ).toBeGreaterThanOrEqual(4)
  })
})

describe('demo seed metrics rework', () => {
  it('feeds quality outcomes, duplicates and rework signals', async () => {
    expect(
      await scalar(
        "select count(*)::text as value from public.tickets where status = 'rejected'",
      ),
    ).toBeGreaterThanOrEqual(5)
    expect(
      await scalar(
        "select count(*)::text as value from public.tickets where status = 'cancelled'",
      ),
    ).toBeGreaterThanOrEqual(5)
    expect(
      await scalar(
        "select count(*)::text as value from public.tickets where status = 'duplicate'",
      ),
    ).toBeGreaterThanOrEqual(5)
    expect(
      await scalar(
        "select count(*)::text as value from public.ticket_links where link_type = 'duplicate_of'",
      ),
    ).toBeGreaterThanOrEqual(5)
    expect(
      await scalar(
        'select count(*)::text as value from public.ticket_duplicate_candidates',
      ),
    ).toBeGreaterThanOrEqual(5)

    expect(
      await scalar(`
        select count(distinct ticket_id)::text as value
        from public.ticket_events where type = 'reopened'
      `),
    ).toBeGreaterThanOrEqual(5)
    expect(
      await scalar(
        'select count(*)::text as value from public.ticket_captures',
      ),
    ).toBeGreaterThanOrEqual(5)
    expect(
      await scalar(`
        select count(distinct ticket_id)::text as value
        from public.ticket_events where type = 'reassigned_supervisor'
      `),
    ).toBeGreaterThanOrEqual(5)
    expect(
      await scalar(`
        select count(distinct ticket_id)::text as value
        from public.ticket_events where type = 'reassigned_technician'
      `),
    ).toBeGreaterThanOrEqual(5)
  })
})

describe('demo seed metrics team', () => {
  it('feeds the team and requester dimensions', async () => {
    expect(
      await scalar(
        'select count(distinct technician_id)::text as value from public.ticket_participants',
      ),
    ).toBeGreaterThanOrEqual(4)
    expect(
      await scalar(
        'select count(distinct requester_id)::text as value from public.tickets',
      ),
    ).toBeGreaterThanOrEqual(4)
    expect(
      await scalar(`
        select count(distinct p.technician_id)::text as value
        from public.ticket_participants p
        where p.participation_type = 'auxiliary'
      `),
    ).toBeGreaterThanOrEqual(2)
  })

  it('keeps the curated demo scenarios that tests and screenshots use', async () => {
    expect(
      await scalar(`
        select count(*)::text as value from public.tickets
        where id in (${CURATED_TICKETS.map((id) => `'${id}'`).join(', ')})
      `),
    ).toBe(6)
  })
})
