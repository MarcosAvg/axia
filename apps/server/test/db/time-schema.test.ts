import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it } from 'vitest'

import type { Database } from '../../src/db/client.js'
import { createDb } from '../../src/db/client.js'
import { ownerConnectionString, prepareTestDatabase } from './helpers.js'

let db: Database
let pool: ReturnType<typeof createDb>['pool']

beforeAll(async () => {
  await prepareTestDatabase()
  const created = createDb(ownerConnectionString())
  db = created.db
  pool = created.pool
}, 60_000)

afterAll(async () => {
  await pool.end()
})

it('guarda confianza, desfase y alertas de tiempo', async () => {
  const columns = await db.execute(sql`
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and (table_name, column_name) in (
        ('ticket_events', 'time_confidence'),
        ('ticket_events', 'client_reported_at'),
        ('ticket_events', 'client_clock_skew_ms'),
        ('time_spans', 'time_confidence'),
        ('evidence', 'client_captured_at'),
        ('evidence', 'time_confidence'),
        ('instance_settings', 'time_sync_tolerance')
      )
    order by table_name, column_name
  `)
  expect(columns.rows).toHaveLength(7)

  const alerts = await db.execute(sql`
    select to_regclass('public.ticket_time_alerts') as table
  `)
  expect((alerts.rows[0] as { table: string | null }).table).toBe(
    'ticket_time_alerts',
  )

  const confidence = await db.execute(sql`
    select enumlabel
    from pg_enum
    where enumtypid = 'public.time_confidence'::regtype
    order by enumsortorder
  `)
  expect(
    confidence.rows.map((row) => (row as { enumlabel: string }).enumlabel),
  ).toEqual(['trusted', 'unverified', 'corrected'])

  const eventTypes = await db.execute(sql`
    select enumlabel
    from pg_enum
    where enumtypid = 'public.event_type'::regtype
      and enumlabel = 'time_alert'
  `)
  expect(eventTypes.rows).toHaveLength(1)
})

it('separa la hora del dispositivo de la hora oficial', async () => {
  const events = await db.execute(sql`
    select column_default
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ticket_events'
      and column_name = 'time_confidence'
  `)
  expect(
    (events.rows[0] as { column_default: string }).column_default,
  ).toContain('trusted')

  const settings = await db.execute(sql`
    select column_default
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'instance_settings'
      and column_name = 'time_sync_tolerance'
  `)
  expect(
    (settings.rows[0] as { column_default: string }).column_default,
  ).toContain('00:05:00')
})
