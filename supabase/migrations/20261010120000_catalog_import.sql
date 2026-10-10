-- Importación de catálogos por plantilla (XLSX generado en la app).
-- Genérica y del núcleo: el cliente resuelve nombres a ids; aquí solo se upserta por clave natural.
-- Todo pasa por RPCs `security definer` con permiso `catalog.manage`; el historial deja rastro.

create table public.catalog_import_specs (
  catalog_key text primary key,
  table_name text not null,
  columns jsonb not null,
  match_columns jsonb not null
);
comment on table public.catalog_import_specs is
  'Lista blanca de catálogos importables: tabla destino, columnas y clave natural.';

create table public.catalog_import_runs (
  id uuid primary key default gen_random_uuid(),
  mode text not null default 'commit' check (mode in ('dry_run', 'commit')),
  source_file text,
  status text not null default 'running'
    check (status in ('running', 'completed', 'failed')),
  summary jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now()
);
comment on table public.catalog_import_runs is
  'Carga de catálogos: archivo, modo, estado y resumen por catálogo.';

create table public.catalog_import_rows (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.catalog_import_runs (id) on delete cascade,
  catalog_key text not null,
  row_number integer,
  raw jsonb not null default '{}'::jsonb,
  result text not null check (result in ('inserted', 'updated', 'skipped', 'error')),
  record_id uuid,
  error text,
  created_at timestamptz not null default now()
);
comment on table public.catalog_import_rows is
  'Fila de una carga de catálogos con su resultado; nada se pierde (raw).';
create index idx_catalog_import_rows_run
  on public.catalog_import_rows (run_id, catalog_key, result);

-- Especificaciones (lista blanca). Los identificadores y tipos son fijos: no vienen del archivo.
insert into public.catalog_import_specs (catalog_key, table_name, columns, match_columns) values
  ('teams', 'teams',
   '[{"name":"name","type":"text"},{"name":"active","type":"boolean"}]',
   '[{"name":"name","type":"text"}]'),
  ('buildings', 'buildings',
   '[{"name":"name","type":"text"},{"name":"active","type":"boolean"}]',
   '[{"name":"name","type":"text"}]'),
  ('dependencies', 'dependencies',
   '[{"name":"name","type":"text"},{"name":"active","type":"boolean"}]',
   '[{"name":"name","type":"text"}]'),
  ('locations', 'locations',
   '[{"name":"building_id","type":"uuid"},{"name":"name","type":"text"},{"name":"active","type":"boolean"}]',
   '[{"name":"building_id","type":"uuid"},{"name":"name","type":"text"}]'),
  ('categories', 'categories',
   '[{"name":"team_id","type":"uuid"},{"name":"name","type":"text"},{"name":"active","type":"boolean"}]',
   '[{"name":"team_id","type":"uuid"},{"name":"name","type":"text"}]'),
  ('subcategories', 'subcategories',
   '[{"name":"category_id","type":"uuid"},{"name":"name","type":"text"},{"name":"active","type":"boolean"}]',
   '[{"name":"category_id","type":"uuid"},{"name":"name","type":"text"}]'),
  ('problems', 'problems',
   '[{"name":"subcategory_id","type":"uuid"},{"name":"name","type":"text"},{"name":"default_priority_id","type":"uuid"},{"name":"active","type":"boolean"}]',
   '[{"name":"subcategory_id","type":"uuid"},{"name":"name","type":"text"}]'),
  ('service_types', 'service_types',
   '[{"name":"name","type":"text"},{"name":"target_minutes","type":"integer"},{"name":"active","type":"boolean"}]',
   '[{"name":"name","type":"text"}]'),
  ('priorities', 'priorities',
   '[{"name":"name","type":"text"},{"name":"position","type":"smallint"},{"name":"target_minutes","type":"integer"},{"name":"active","type":"boolean"}]',
   '[{"name":"name","type":"text"}]'),
  ('channels', 'channels',
   '[{"name":"name","type":"text"},{"name":"is_platform","type":"boolean"},{"name":"active","type":"boolean"}]',
   '[{"name":"name","type":"text"}]'),
  ('requesters', 'requesters',
   '[{"name":"full_name","type":"text"},{"name":"contact","type":"text"},{"name":"dependency_id","type":"uuid"},{"name":"active","type":"boolean"}]',
   '[{"name":"full_name","type":"text"},{"name":"dependency_id","type":"uuid"}]'),
  ('technicians', 'technicians',
   '[{"name":"full_name","type":"text"},{"name":"team_id","type":"uuid"},{"name":"active","type":"boolean"}]',
   '[{"name":"full_name","type":"text"},{"name":"team_id","type":"uuid"}]'),
  ('reasons', 'reasons',
   '[{"name":"use","type":"public.reason_use"},{"name":"parent_id","type":"uuid"},{"name":"name","type":"text"},{"name":"position","type":"smallint"},{"name":"requires_note","type":"boolean"},{"name":"allows_estimated_date","type":"boolean"},{"name":"clock_class","type":"public.clock_class"},{"name":"active","type":"boolean"}]',
   '[{"name":"use","type":"public.reason_use"},{"name":"parent_id","type":"uuid"},{"name":"name","type":"text"}]');

alter table public.catalog_import_specs enable row level security;
alter table public.catalog_import_runs enable row level security;
alter table public.catalog_import_rows enable row level security;

create policy catalog_import_specs_read on public.catalog_import_specs
  for select to authenticated
  using (public.has_permission((select auth.uid()), 'catalog.manage'));
create policy catalog_import_runs_read on public.catalog_import_runs
  for select to authenticated
  using (public.has_permission((select auth.uid()), 'catalog.manage'));
create policy catalog_import_rows_read on public.catalog_import_rows
  for select to authenticated
  using (public.has_permission((select auth.uid()), 'catalog.manage'));

-- Abre una carga (historial).
create or replace function public.catalog_import_start(
  p_mode text default 'commit',
  p_source_file text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform public.require_permission('catalog.manage');
  if p_mode not in ('dry_run', 'commit') then
    raise exception 'Modo de importación inválido' using errcode = '22023';
  end if;
  insert into public.catalog_import_runs (mode, source_file, created_by)
  values (p_mode, nullif(btrim(p_source_file), ''), auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;
comment on function public.catalog_import_start(text, text) is 'Abre una carga de catálogos.';
revoke execute on function public.catalog_import_start(text, text) from public, anon;
grant execute on function public.catalog_import_start(text, text) to authenticated;

-- Cierra una carga (historial).
create or replace function public.catalog_import_finish(
  p_run_id uuid,
  p_status text,
  p_summary jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_permission('catalog.manage');
  if p_status not in ('completed', 'failed') then
    raise exception 'Estado de importación inválido' using errcode = '22023';
  end if;
  update public.catalog_import_runs
  set status = p_status,
      summary = coalesce(p_summary, '{}'::jsonb),
      finished_at = now()
  where id = p_run_id;
end;
$$;
comment on function public.catalog_import_finish(uuid, text, jsonb) is 'Cierra una carga de catálogos.';
revoke execute on function public.catalog_import_finish(uuid, text, jsonb) from public, anon;
grant execute on function public.catalog_import_finish(uuid, text, jsonb) to authenticated;

-- Upserta una hoja completa en una transacción. `$1` es la fila (jsonb); los identificadores
-- salen de la lista blanca y los valores van parametrizados. Los errores por fila se registran.
create or replace function public.catalog_import_sheet(
  p_run_id uuid,
  p_catalog text,
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_table text;
  v_columns jsonb;
  v_match jsonb;
  v_row jsonb;
  v_col jsonb;
  v_name text;
  v_type text;
  v_cols text[];
  v_vals text[];
  v_sets text[];
  v_where text := '';
  v_id uuid;
  v_rownum int := 0;
  v_inserted int := 0;
  v_updated int := 0;
  v_errors int := 0;
  v_error text;
begin
  perform public.require_permission('catalog.manage');
  select table_name, columns, match_columns
    into v_table, v_columns, v_match
  from public.catalog_import_specs where catalog_key = p_catalog;
  if v_table is null then
    raise exception 'Catálogo desconocido: %', p_catalog using errcode = '22023';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Las filas deben ser un arreglo' using errcode = '22023';
  end if;

  for v_col in select * from jsonb_array_elements(v_match) loop
    v_name := v_col ->> 'name';
    v_type := v_col ->> 'type';
    v_where := v_where
      || case when v_where = '' then '' else ' and ' end
      || format('%I is not distinct from ($1->>%L)::%s', v_name, v_name, v_type);
  end loop;

  for v_row in select * from jsonb_array_elements(p_rows) loop
    v_rownum := v_rownum + 1;
    begin
      for v_col in select * from jsonb_array_elements(v_match) loop
        if not (v_row ? (v_col ->> 'name')) then
          raise exception 'Falta la clave natural «%»', v_col ->> 'name'
            using errcode = 'P0001';
        end if;
      end loop;

      v_cols := array[]::text[];
      v_vals := array[]::text[];
      v_sets := array[]::text[];
      for v_col in select * from jsonb_array_elements(v_columns) loop
        v_name := v_col ->> 'name';
        v_type := v_col ->> 'type';
        if v_row ? v_name then
          v_cols := array_append(v_cols, v_name);
          v_vals := array_append(v_vals, format('($1->>%L)::%s', v_name, v_type));
          v_sets := array_append(v_sets, format('%I = ($1->>%L)::%s', v_name, v_name, v_type));
        end if;
      end loop;
      if array_length(v_cols, 1) is null then
        raise exception 'La fila no trae columnas válidas' using errcode = 'P0001';
      end if;

      execute format('select id from public.%I where %s', v_table, v_where)
        into v_id using v_row;

      if v_id is not null then
        execute format(
          'update public.%I set %s where id = $2',
          v_table, array_to_string(v_sets, ', ')
        ) using v_row, v_id;
        v_updated := v_updated + 1;
        insert into public.catalog_import_rows
          (run_id, catalog_key, row_number, raw, result, record_id)
        values (p_run_id, p_catalog, v_rownum, v_row, 'updated', v_id);
      else
        execute format(
          'insert into public.%I (%s) values (%s) returning id',
          v_table, array_to_string(v_cols, ', '), array_to_string(v_vals, ', ')
        ) into v_id using v_row;
        v_inserted := v_inserted + 1;
        insert into public.catalog_import_rows
          (run_id, catalog_key, row_number, raw, result, record_id)
        values (p_run_id, p_catalog, v_rownum, v_row, 'inserted', v_id);
      end if;
    exception when others then
      v_error := sqlerrm;
      v_errors := v_errors + 1;
      insert into public.catalog_import_rows
        (run_id, catalog_key, row_number, raw, result, error)
      values (p_run_id, p_catalog, v_rownum, v_row, 'error', v_error);
    end;
  end loop;

  return jsonb_build_object(
    'catalog', p_catalog,
    'inserted', v_inserted,
    'updated', v_updated,
    'errors', v_errors
  );
end;
$$;
comment on function public.catalog_import_sheet(uuid, text, jsonb) is
  'Upserta una hoja de catálogo por clave natural (atómico) y registra el resultado por fila.';
revoke execute on function public.catalog_import_sheet(uuid, text, jsonb) from public, anon;
grant execute on function public.catalog_import_sheet(uuid, text, jsonb) to authenticated;
