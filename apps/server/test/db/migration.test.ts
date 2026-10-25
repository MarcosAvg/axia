import { Client } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { runMigrations } from '../../src/db/migrate.js'
import {
  appConnectionString,
  ownerConnectionString,
  prepareTestDatabase,
} from './helpers.js'

let owner: Client
let app: Client

async function scalar(client: Client, sql: string): Promise<number> {
  const result = await client.query<{ value: string }>(sql)
  return Number(result.rows[0]?.value ?? 0)
}

beforeAll(async () => {
  await prepareTestDatabase()
  owner = new Client({ connectionString: ownerConnectionString() })
  app = new Client({ connectionString: appConnectionString() })
  await owner.connect()
  await app.connect()
}, 60_000)

afterAll(async () => {
  await app?.end()
  await owner?.end()
})

describe('base schema objects', () => {
  it('creates the expected public objects without hosted-platform-only structures', async () => {
    expect(
      await scalar(
        owner,
        "select count(*)::text as value from pg_tables where schemaname = 'public'",
      ),
    ).toBe(58)
    expect(
      await scalar(
        owner,
        "select count(*)::text as value from pg_views where schemaname = 'public'",
      ),
    ).toBe(15)
    expect(
      await scalar(
        owner,
        "select count(*)::text as value from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'",
      ),
    ).toBe(34)
    expect(
      await scalar(
        owner,
        "select count(*)::text as value from pg_policies where schemaname = 'public'",
      ),
    ).toBe(0)
    expect(
      await scalar(
        owner,
        "select count(*)::text as value from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relrowsecurity",
      ),
    ).toBe(0)
    expect(
      await scalar(
        owner,
        "select count(*)::text as value from pg_namespace where nspname in ('auth', 'storage')",
      ),
    ).toBe(0)
  })
})

describe('base schema account tables', () => {
  it('keeps account, session and evidence tables in the core', async () => {
    const columns = await owner.query<{
      table_name: string
      column_name: string
    }>(`
      select table_name, column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name in ('users', 'sessions', 'login_attempts', 'notification_deliveries', 'evidence', 'idempotency_keys')
      order by table_name, column_name
    `)
    const names = new Set(
      columns.rows.map((row) => `${row.table_name}.${row.column_name}`),
    )

    expect(names.has('users.username')).toBe(true)
    expect(names.has('users.password_hash')).toBe(true)
    expect(names.has('users.must_change_password')).toBe(true)
    expect(names.has('sessions.token_hash')).toBe(true)
    expect(names.has('sessions.idle_expires_at')).toBe(true)
    expect(names.has('login_attempts.successful')).toBe(true)
    expect(names.has('notification_deliveries.next_attempt_at')).toBe(true)
    expect(names.has('notification_deliveries.last_error')).toBe(true)
    expect(names.has('evidence.processing_state')).toBe(true)
    expect(names.has('evidence.sha256')).toBe(true)
    expect(names.has('idempotency_keys.status')).toBe(true)
    expect(names.has('idempotency_keys.response')).toBe(true)
  })
})

describe('base schema relationships', () => {
  it('points account foreign keys at public.users', async () => {
    expect(
      await scalar(
        owner,
        "select count(*)::text as value from pg_constraint where contype = 'f' and confrelid = 'public.users'::regclass",
      ),
    ).toBe(33)
    expect(
      await scalar(
        owner,
        "select (to_regclass('auth.users') is null)::int::text as value",
      ),
    ).toBe(1)
  })

  it('keeps the domain enums and removes email/sms channels', async () => {
    const channels = await owner.query<{ label: string }>(`
      select e.enumlabel as label
      from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public' and t.typname = 'notification_channel'
      order by e.enumsortorder
    `)

    expect(channels.rows.map((row) => row.label)).toEqual(['in_app', 'push'])
    expect(
      await scalar(
        owner,
        "select count(*)::text as value from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public' and t.typtype = 'e'",
      ),
    ).toBe(17)
  })
})

describe('base schema views and triggers', () => {
  it('keeps the timeline view without a hosted-platform identity predicate', async () => {
    expect(
      await scalar(
        owner,
        "select count(*)::text as value from pg_views where schemaname = 'public' and viewname = 'v_ticket_timeline'",
      ),
    ).toBe(1)
    expect(
      await scalar(
        owner,
        "select count(*)::text as value from pg_views where schemaname = 'public' and viewname = 'v_ticket_events_requester'",
      ),
    ).toBe(0)

    const definition = await owner.query<{ definition: string }>(
      "select pg_get_viewdef('public.v_ticket_timeline'::regclass, true) as definition",
    )
    expect(definition.rows[0]?.definition ?? '').not.toContain('auth.uid')
  })

  it('creates append-only and domain triggers', async () => {
    const triggers = await owner.query<{ tgname: string }>(`
      select tgname from pg_trigger where not tgisinternal
    `)
    const names = new Set(triggers.rows.map((row) => row.tgname))

    expect(names.has('ticket_events_no_mutation')).toBe(true)
    expect(names.has('evidence_no_delete')).toBe(true)
    expect(names.has('ticket_events_record_spans')).toBe(true)
    expect(names.has('ticket_events_notify')).toBe(true)
    expect(names.has('ticket_events_broadcast')).toBe(true)
    expect(names.has('users_set_updated_at')).toBe(true)
    expect(names.has('tickets_set_folio')).toBe(true)
  })
})

describe('indexes', () => {
  it('creates the trigram extension and the required indexes', async () => {
    expect(
      await scalar(
        owner,
        "select count(*)::text as value from pg_extension where extname = 'pg_trgm'",
      ),
    ).toBe(1)
    expect(
      await scalar(
        owner,
        "select count(*)::text as value from pg_indexes where schemaname = 'public' and indexname = 'idx_tickets_description_trgm'",
      ),
    ).toBe(1)
    expect(
      await scalar(
        owner,
        "select count(*)::text as value from pg_indexes where schemaname = 'public' and indexname = 'idx_tickets_folio_trgm'",
      ),
    ).toBe(1)
    expect(
      await scalar(
        owner,
        "select count(*)::text as value from pg_indexes where schemaname = 'public' and indexname = 'idx_evidence_uploaded_by_ready'",
      ),
    ).toBe(1)
    expect(
      await scalar(
        owner,
        "select count(*)::text as value from pg_indexes where schemaname = 'public' and indexname = 'ticket_pauses_one_open'",
      ),
    ).toBe(1)
  })
})

describe('application role privileges', () => {
  it('has read access and the intended write boundaries', async () => {
    const privileges = await owner.query<{
      can_select: boolean
      can_insert: boolean
      can_delete: boolean
      can_update_events: boolean
      can_delete_evidence: boolean
      can_create_schema_object: boolean
    }>(`
      select
        has_table_privilege('axia_app', 'public.tickets', 'SELECT') as can_select,
        has_table_privilege('axia_app', 'public.tickets', 'INSERT') as can_insert,
        has_table_privilege('axia_app', 'public.tickets', 'DELETE') as can_delete,
        has_table_privilege('axia_app', 'public.ticket_events', 'UPDATE') as can_update_events,
        has_table_privilege('axia_app', 'public.evidence', 'DELETE') as can_delete_evidence,
        has_schema_privilege('axia_app', 'public', 'CREATE') as can_create_schema_object
    `)

    expect(privileges.rows[0]).toEqual({
      can_select: true,
      can_insert: true,
      can_delete: false,
      can_update_events: false,
      can_delete_evidence: false,
      can_create_schema_object: false,
    })
  })
})

describe('application role runtime', () => {
  it('can query data and execute the metrics helpers, but cannot run DDL', async () => {
    const count = await app.query<{ value: string }>(
      'select count(*)::text as value from public.tickets',
    )
    expect(Number(count.rows[0]?.value)).toBe(0)

    const metrics = await app.query<{ value: boolean }>(
      'select public.metrics_date_in(now(), null, null) as value',
    )
    expect(metrics.rows[0]?.value).toBe(true)

    await expect(
      app.query('create table should_not_exist (id integer)'),
    ).rejects.toMatchObject({
      code: '42501',
    })
  })

  it('is not a superuser or a role with DDL powers', async () => {
    const role = await owner.query<{
      rolsuper: boolean
      rolcreatedb: boolean
      rolcreaterole: boolean
    }>(
      "select rolsuper, rolcreatedb, rolcreaterole from pg_roles where rolname = 'axia_app'",
    )

    expect(role.rows[0]).toEqual({
      rolsuper: false,
      rolcreatedb: false,
      rolcreaterole: false,
    })
  })
})

describe('migration runner', () => {
  it('is idempotent', async () => {
    await runMigrations(owner)
    expect(
      await scalar(
        owner,
        'select count(*)::text as value from axia_migrations.schema_migrations',
      ),
    ).toBe(11)
  })

  it('enforces username normalization and uniqueness', async () => {
    await expect(
      owner.query(
        "insert into public.users (username, full_name, password_hash) values ('Test.User', 'Test', 'x')",
      ),
    ).rejects.toMatchObject({ code: '23514' })

    await owner.query(
      "insert into public.users (username, full_name, password_hash) values ('test.user', 'Test', 'x')",
    )
    await expect(
      owner.query(
        "insert into public.users (username, full_name, password_hash) values ('test.user', 'Other', 'x')",
      ),
    ).rejects.toMatchObject({ code: '23505' })
    await owner.query("delete from public.users where username = 'test.user'")
  })
})
