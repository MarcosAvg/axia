import { readFile } from 'node:fs/promises'

import { Client } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { ownerConnectionString, prepareTestDatabase } from './helpers.js'

let owner: Client

async function scalar(sql: string): Promise<number> {
  const result = await owner.query<{ value: string }>(sql)
  return Number(result.rows[0]?.value ?? 0)
}

async function expectReferenceCounts() {
  expect(
    await scalar('select count(*)::text as value from public.service_types'),
  ).toBe(5)
  expect(
    await scalar('select count(*)::text as value from public.priorities'),
  ).toBe(4)
  expect(
    await scalar('select count(*)::text as value from public.channels'),
  ).toBe(3)
  expect(
    await scalar('select count(*)::text as value from public.work_calendars'),
  ).toBe(2)
  expect(
    await scalar(
      'select count(*)::text as value from public.work_calendar_intervals',
    ),
  ).toBe(10)
  expect(
    await scalar(
      'select count(*)::text as value from public.work_calendar_holidays',
    ),
  ).toBe(28)
  expect(
    await scalar('select count(*)::text as value from public.reasons'),
  ).toBe(62)
  expect(
    await scalar('select count(*)::text as value from public.escalation_rules'),
  ).toBe(5)
  expect(
    await scalar(
      'select count(*)::text as value from public.notification_rules',
    ),
  ).toBe(9)
}

beforeAll(async () => {
  await prepareTestDatabase()
  owner = new Client({ connectionString: ownerConnectionString() })
  await owner.connect()
}, 60_000)

afterAll(async () => {
  await owner?.end()
})

describe('reference seed catalogs', () => {
  it('creates the catalogs required by a clean installation', async () => {
    await expectReferenceCounts()
    expect(
      await scalar('select count(*)::text as value from public.permissions'),
    ).toBe(32)
    expect(
      await scalar('select count(*)::text as value from public.roles'),
    ).toBe(4)
  })

  it('does not seed permissions without an action', async () => {
    expect(
      await scalar(`
        select count(*)::text as value
        from public.permissions
        where id in (
          'ticket.open_claim_on_behalf',
          'ticket.cancel_on_behalf',
          'ticket.reopen',
          'data.import'
        )
      `),
    ).toBe(0)
  })

  it('keeps reasons hierarchical and consistent', async () => {
    expect(
      await scalar(`
        select count(*)::text as value
        from public.reasons child
        left join public.reasons parent on parent.id = child.parent_id
        where child.parent_id is not null and parent.id is null
      `),
    ).toBe(0)
    expect(
      await scalar(
        "select count(*)::text as value from public.reasons where use = 'pause' and parent_id is not null",
      ),
    ).toBe(10)
  })
})

describe('reference seed boundaries', () => {
  it('sets the platform channel and installation defaults', async () => {
    const settings = await owner.query<{
      default_priority: string | null
      default_calendar: string | null
      platform_channel: boolean
    }>(`
      select
        (select name from public.priorities where id = s.default_priority_id) as default_priority,
        (select name from public.work_calendars where id = s.default_calendar_id) as default_calendar,
        exists(select 1 from public.channels where name = 'Web' and is_platform) as platform_channel
      from public.instance_settings s
    `)

    expect(settings.rows[0]).toEqual({
      default_priority: 'Media',
      default_calendar: 'Oficina',
      platform_channel: true,
    })
  })

  it('does not insert demo people, teams, buildings or tickets', async () => {
    expect(
      await scalar('select count(*)::text as value from public.users'),
    ).toBe(0)
    expect(
      await scalar('select count(*)::text as value from public.technicians'),
    ).toBe(0)
    expect(
      await scalar('select count(*)::text as value from public.requesters'),
    ).toBe(0)
    expect(
      await scalar('select count(*)::text as value from public.teams'),
    ).toBe(0)
    expect(
      await scalar('select count(*)::text as value from public.buildings'),
    ).toBe(0)
    expect(
      await scalar('select count(*)::text as value from public.tickets'),
    ).toBe(0)
  })
})

describe('reference seed idempotency', () => {
  it('can be re-run without duplicating reference data', async () => {
    const migration = await readFile(
      new URL(
        '../../db/migrations/0007_reference_catalogs.sql',
        import.meta.url,
      ),
      'utf8',
    )
    await owner.query(migration)
    await expectReferenceCounts()
  })
})
