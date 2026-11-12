import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Client } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { verifyPassword } from '../../src/auth/password.js'
import { seedDemo } from '../../src/db/seed-demo/index.js'
import { ownerConnectionString, prepareTestDatabase } from './helpers.js'

const DEMO_PASSWORD = 'DemoPassword123!'

let owner: Client
let evidenceDir: string

async function scalar(sql: string): Promise<number> {
  const result = await owner.query<{ value: string }>(sql)
  return Number(result.rows[0]?.value ?? 0)
}

async function expectCatalogCounts() {
  expect(await scalar('select count(*)::text as value from public.users')).toBe(
    4,
  )
  expect(await scalar('select count(*)::text as value from public.teams')).toBe(
    2,
  )
  expect(
    await scalar('select count(*)::text as value from public.buildings'),
  ).toBe(2)
  expect(
    await scalar('select count(*)::text as value from public.locations'),
  ).toBe(4)
  expect(
    await scalar('select count(*)::text as value from public.categories'),
  ).toBe(4)
  expect(
    await scalar('select count(*)::text as value from public.technicians'),
  ).toBe(5)
  expect(
    await scalar('select count(*)::text as value from public.requesters'),
  ).toBe(6)
  expect(
    await scalar(
      'select count(*)::text as value from public.supervisor_scopes',
    ),
  ).toBe(2)
}

async function expectDataCounts() {
  expect(
    await scalar('select count(*)::text as value from public.tickets'),
  ).toBe(240)
  expect(
    await scalar('select count(*)::text as value from public.ticket_events'),
  ).toBeGreaterThan(1500)
  expect(
    await scalar(
      'select count(*)::text as value from public.ticket_assignments',
    ),
  ).toBeGreaterThan(200)
  expect(
    await scalar(
      'select count(*)::text as value from public.ticket_participants',
    ),
  ).toBeGreaterThan(150)
}

async function expectDemoCounts() {
  await expectCatalogCounts()
  await expectDataCounts()
}

beforeAll(async () => {
  evidenceDir = await mkdtemp(join(tmpdir(), 'axia-demo-seed-'))
  await prepareTestDatabase()
  owner = new Client({ connectionString: ownerConnectionString() })
  await owner.connect()
}, 60_000)

afterAll(async () => {
  await owner?.end()
  await rm(evidenceDir, { recursive: true, force: true })
})

describe('demo seed creation', () => {
  it('creates demo users, catalogs and the full metrics dataset', async () => {
    const result = await seedDemo(owner, {
      password: DEMO_PASSWORD,
      evidenceDir,
    })
    expect(result).toMatchObject({
      usersCreated: 4,
      ticketsCreated: 240,
      ticketsSkipped: 0,
      passwordGenerated: false,
      passwordApplied: true,
    })
    await expectDemoCounts()
  })
})

describe('demo seed state and idempotency', () => {
  it('keeps the curated states, covers every state and hashes the password', async () => {
    const statuses = await owner.query<{ status: string }>(
      'select distinct status::text from public.tickets order by status::text',
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
    const curated = await owner.query<{ status: string }>(
      `select status::text from public.tickets
       where id in (
         'de000000-0000-4000-8000-000000000001',
         'de000000-0000-4000-8000-000000000002',
         'de000000-0000-4000-8000-000000000003',
         'de000000-0000-4000-8000-000000000004',
         'de000000-0000-4000-8000-000000000005',
         'de000000-0000-4000-8000-000000000006'
       )
       order by id`,
    )
    expect(curated.rows.map((row) => row.status)).toEqual([
      'registered',
      'with_supervisor',
      'assigned',
      'in_progress',
      'attended',
      'closed',
    ])

    const users = await owner.query<{ password_hash: string }>(
      "select password_hash from public.users where username = 'demo.requester'",
    )
    expect(
      await verifyPassword(users.rows[0]?.password_hash ?? '', DEMO_PASSWORD),
    ).toBe(true)
  })

  it('is idempotent and does not rotate passwords by default', async () => {
    const result = await seedDemo(owner, {
      password: DEMO_PASSWORD,
      evidenceDir,
    })
    expect(result).toMatchObject({
      usersCreated: 0,
      ticketsCreated: 0,
      ticketsSkipped: 240,
      passwordApplied: false,
    })
    await expectDemoCounts()
  })
})

describe('demo seed safeguards', () => {
  it('rejects a password shorter than the policy and rolls back', async () => {
    const before = await scalar(
      'select count(*)::text as value from public.tickets',
    )
    await expect(
      seedDemo(owner, { password: 'short', evidenceDir }),
    ).rejects.toThrow(/at least 12/)
    expect(
      await scalar('select count(*)::text as value from public.tickets'),
    ).toBe(before)
  })

  it('can reset the demo passwords explicitly', async () => {
    const result = await seedDemo(owner, {
      password: 'AnotherDemoPassword123!',
      evidenceDir,
      resetPasswords: true,
    })
    expect(result.passwordApplied).toBe(true)
    await expectDemoCounts()
    const users = await owner.query<{ password_hash: string }>(
      "select password_hash from public.users where username = 'demo.supervisor'",
    )
    expect(
      await verifyPassword(
        users.rows[0]?.password_hash ?? '',
        'AnotherDemoPassword123!',
      ),
    ).toBe(true)
  })
})

describe('demo catalog coverage', () => {
  it('keeps all locations, classification paths and routing operational', async () => {
    const gaps = await owner.query(`
      select 'building' as kind, b.name from public.buildings b where b.active
        and not exists (select 1 from public.locations l where l.building_id = b.id and l.active)
      union all
      select 'location', l.name from public.locations l where l.active
        and not exists (select 1 from public.dependency_locations dl
          join public.dependencies d on d.id = dl.dependency_id and d.active where dl.location_id = l.id)
      union all
      select 'dependency', d.name from public.dependencies d where d.active
        and not exists (select 1 from public.dependency_locations dl
          join public.locations l on l.id = dl.location_id and l.active where dl.dependency_id = d.id)
      union all
      select 'category', c.name from public.categories c where c.active
        and not exists (select 1 from public.subcategories s where s.category_id = c.id and s.active)
      union all
      select 'subcategory', s.name from public.subcategories s where s.active
        and not exists (select 1 from public.problems p where p.subcategory_id = s.id and p.active)
      union all
      select 'problem', p.name from public.problems p
        join public.subcategories s on s.id = p.subcategory_id
        join public.categories c on c.id = s.category_id
        where p.active and (not exists (select 1 from public.teams t where t.id = p.team_id and t.active)
          or not exists (select 1 from public.technician_categories tc
            join public.technicians t on t.id = tc.technician_id and t.active
            where tc.category_id = c.id and t.team_id = p.team_id))
      union all
      select 'coverage', t.name || ' / ' || b.name from public.teams t cross join public.buildings b
        where t.active and b.active and not exists (select 1 from public.supervisor_scopes ss
          join public.users u on u.id = ss.user_id and u.active
          join public.supervisor_scope_buildings sb on sb.scope_id = ss.id
          where ss.team_id = t.id and ss.active and sb.building_id = b.id)
    `)
    expect(gaps.rows).toEqual([])
    const reasonUses = await owner.query(
      `select use::text from public.reasons where active group by use`,
    )
    expect(reasonUses.rows.map((row) => row.use).sort()).toEqual([
      'auxiliary_support',
      'cancellation',
      'claim',
      'claim_outcome',
      'pause',
      'reactivation',
      'recapture',
      'rejection',
      'supervisor_reassignment',
      'technician_reassignment',
    ])
  })
})
