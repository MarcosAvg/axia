import { Client } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { verifyPassword } from '../../src/auth/password.js'
import { seedDemo } from '../../src/db/seed-demo/index.js'
import { ownerConnectionString, prepareTestDatabase } from './helpers.js'

const DEMO_PASSWORD = 'DemoPassword123!'

let owner: Client

async function scalar(sql: string): Promise<number> {
  const result = await owner.query<{ value: string }>(sql)
  return Number(result.rows[0]?.value ?? 0)
}

async function expectDemoCounts() {
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
  ).toBe(3)
  expect(
    await scalar('select count(*)::text as value from public.requesters'),
  ).toBe(2)
  expect(
    await scalar('select count(*)::text as value from public.tickets'),
  ).toBe(6)
  expect(
    await scalar('select count(*)::text as value from public.ticket_events'),
  ).toBe(21)
  expect(
    await scalar(
      'select count(*)::text as value from public.ticket_assignments',
    ),
  ).toBe(9)
  expect(
    await scalar(
      'select count(*)::text as value from public.ticket_participants',
    ),
  ).toBe(4)
  expect(
    await scalar(
      'select count(*)::text as value from public.supervisor_scopes',
    ),
  ).toBe(2)
}

beforeAll(async () => {
  await prepareTestDatabase()
  owner = new Client({ connectionString: ownerConnectionString() })
  await owner.connect()
}, 60_000)

afterAll(async () => {
  await owner?.end()
})

describe('demo seed', () => {
  it('creates demo users, catalogs and one ticket per state', async () => {
    const result = await seedDemo(owner, { password: DEMO_PASSWORD })
    expect(result).toMatchObject({
      usersCreated: 4,
      ticketsCreated: 6,
      ticketsSkipped: 0,
      passwordGenerated: false,
      passwordApplied: true,
    })
    await expectDemoCounts()
  })

  it('keeps one ticket per state and hashes the demo password', async () => {
    const statuses = await owner.query<{ status: string }>(
      'select status::text from public.tickets order by status::text',
    )
    expect(statuses.rows.map((row) => row.status)).toEqual([
      'assigned',
      'attended',
      'closed',
      'in_progress',
      'registered',
      'with_supervisor',
    ])

    const users = await owner.query<{ password_hash: string }>(
      "select password_hash from public.users where username = 'demo.requester'",
    )
    expect(
      await verifyPassword(users.rows[0]?.password_hash ?? '', DEMO_PASSWORD),
    ).toBe(true)
  })

  it('is idempotent and does not rotate passwords by default', async () => {
    const result = await seedDemo(owner, { password: DEMO_PASSWORD })
    expect(result).toMatchObject({
      usersCreated: 0,
      ticketsCreated: 0,
      ticketsSkipped: 6,
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
    await expect(seedDemo(owner, { password: 'short' })).rejects.toThrow(
      /at least 12/,
    )
    expect(
      await scalar('select count(*)::text as value from public.tickets'),
    ).toBe(before)
  })

  it('can reset the demo passwords explicitly', async () => {
    const result = await seedDemo(owner, {
      password: 'AnotherDemoPassword123!',
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
