export const retiredTables = [
  'catalog_import_rows',
  'catalog_import_runs',
  'catalog_import_specs',
  'catalog_aliases',
  'import_records',
  'import_batches',
  'import_status_map',
  'integration_tasks',
]

export const retiredFixtures = [
  {
    table: 'catalog_aliases',
    insert:
      "insert into public.catalog_aliases (catalog, alias, record_id) values ('teams', 'fixture', gen_random_uuid())",
  },
  {
    table: 'catalog_import_runs',
    insert: 'insert into public.catalog_import_runs default values',
  },
  {
    table: 'catalog_import_rows',
    insert:
      "with r as (insert into public.catalog_import_runs default values returning id) insert into public.catalog_import_rows (run_id, catalog_key, result) select id, 'teams', 'inserted' from r",
  },
  {
    table: 'catalog_import_specs',
    insert:
      "insert into public.catalog_import_specs (catalog_key, table_name, columns, match_columns) values ('fixture', 'teams', '[]', '[]')",
  },
  {
    table: 'import_batches',
    insert: "insert into public.import_batches (system) values ('fixture')",
  },
  {
    table: 'import_records',
    insert:
      "with b as (insert into public.import_batches (system) values ('fixture') returning id) insert into public.import_records (batch_id, raw) select id, '{}'::jsonb from b",
  },
  {
    table: 'import_status_map',
    insert:
      "insert into public.import_status_map (system, external_status, ticket_status) values ('fixture', 'pending', 'registered')",
  },
  {
    table: 'integration_tasks',
    insert:
      "insert into public.integration_tasks (ticket_id, system, description) select id, 'fixture', 'fixture task' from public.tickets order by id limit 1",
  },
]
