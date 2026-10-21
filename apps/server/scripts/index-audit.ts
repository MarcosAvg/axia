import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { Client } from 'pg'

const envFile = fileURLToPath(new URL('../../../.env', import.meta.url))
if (existsSync(envFile)) {
  process.loadEnvFile(envFile)
}

const connectionString =
  process.env.DATABASE_URL ?? process.env.MIGRATION_DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL or MIGRATION_DATABASE_URL is required')
}

const client = new Client({ connectionString })

type ForeignKeyRow = {
  table_name: string
  constraint_name: string
  definition: string
}

type IndexRow = {
  table_name: string
  index_name: string
  scans: string
  size: string
}

type TableRow = {
  table_name: string
  live_rows: string
  dead_rows: string
  sequential_scans: string
  index_scans: string
  last_analyze: string | null
  last_autoanalyze: string | null
}

async function reportMissingForeignKeys() {
  const missing = await client.query<ForeignKeyRow>(`
    select
      conrelid::regclass::text as table_name,
      conname as constraint_name,
      pg_get_constraintdef(oid) as definition
    from pg_constraint c
    where c.contype = 'f'
      and c.connamespace = 'public'::regnamespace
      and not exists (
        select 1
        from pg_index i
        where i.indrelid = c.conrelid
          and i.indisvalid
          and i.indpred is null
          and string_to_array(i.indkey::text, ' ')::int2[] @> c.conkey
      )
    order by 1, 2
  `)

  console.log('\nFKs sin un índice que cubra todas sus columnas:')
  if (missing.rows.length === 0) {
    console.log('  (ninguna)')
    return
  }

  for (const row of missing.rows) {
    console.log(`  ${row.table_name}.${row.constraint_name}: ${row.definition}`)
  }
  console.log(
    '\n  Revisar con EXPLAIN antes de crear índices; no indexar todos por reflejo.',
  )
}

async function reportUnusedIndexes() {
  const unused = await client.query<IndexRow>(`
    select
      s.relname as table_name,
      s.indexrelname as index_name,
      s.idx_scan::text as scans,
      pg_size_pretty(pg_relation_size(s.indexrelid)) as size
    from pg_stat_user_indexes s
    join pg_index i on i.indexrelid = s.indexrelid
    where schemaname = 'public'
      and idx_scan = 0
      and not i.indisunique
    order by pg_relation_size(s.indexrelid) desc
    limit 20
  `)

  console.log('\nÍndices no usados desde el último reinicio de estadísticas:')
  if (unused.rows.length === 0) {
    console.log('  (ninguno)')
    return
  }

  for (const row of unused.rows) {
    console.log(
      `  ${row.table_name}.${row.index_name} (${row.size}, ${row.scans} scans)`,
    )
  }
  console.log(
    '  En una base recién creada o sin tráfico, este listado no es concluyente.',
  )
}

async function reportTableStats() {
  const tables = await client.query<TableRow>(`
    select
      relname as table_name,
      n_live_tup::text as live_rows,
      n_dead_tup::text as dead_rows,
      seq_scan::text as sequential_scans,
      coalesce(idx_scan, 0)::text as index_scans,
      last_analyze::text as last_analyze,
      last_autoanalyze::text as last_autoanalyze
    from pg_stat_user_tables
    where schemaname = 'public'
    order by n_live_tup desc, relname
  `)

  console.log('\nActividad y estadísticas por tabla:')
  for (const row of tables.rows) {
    const analyzed = row.last_analyze ?? row.last_autoanalyze ?? 'nunca'
    console.log(
      `  ${row.table_name}: ${row.live_rows} filas, ${row.dead_rows} muertas, seq=${row.sequential_scans}, idx=${row.index_scans}, analyze=${analyzed}`,
    )
  }
}

async function main() {
  await client.connect()
  await reportMissingForeignKeys()
  await reportUnusedIndexes()
  await reportTableStats()
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await client.end()
  })
