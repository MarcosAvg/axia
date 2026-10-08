-- Fase 6A: infraestructura genérica de importación (agnóstica del núcleo).
-- El sistema es dato (`external_systems`); el mapeo de estatus y los alias son filas.
-- Nada aquí nombra plataformas; los adaptadores viven aislados (features/integrations).

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  system text not null references public.external_systems (name),
  mode text not null default 'dry_run' check (mode in ('dry_run', 'commit')),
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  summary jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now()
);
comment on table public.import_batches is
  'Lote de importación: origen, modo (dry run o commit), estado y resumen.';

create table public.import_records (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.import_batches (id) on delete cascade,
  row_number integer,
  raw jsonb not null,
  result text not null default 'pending'
    check (result in ('pending', 'inserted', 'updated', 'skipped', 'error')),
  ticket_id uuid references public.tickets (id),
  error text,
  created_at timestamptz not null default now()
);
comment on table public.import_records is
  'Fila cruda de un lote con su resultado; nada se pierde (raw).';
create index idx_import_records_batch on public.import_records (batch_id, result);

create table public.catalog_aliases (
  id uuid primary key default gen_random_uuid(),
  catalog text not null,
  alias text not null,
  record_id uuid not null,
  created_at timestamptz not null default now(),
  unique (catalog, alias)
);
comment on table public.catalog_aliases is
  'Texto original de la fuente -> registro del catálogo, por tipo de catálogo.';

create table public.import_status_map (
  id uuid primary key default gen_random_uuid(),
  system text not null references public.external_systems (name),
  external_status text not null,
  ticket_status public.ticket_status not null,
  created_at timestamptz not null default now(),
  unique (system, external_status)
);
comment on table public.import_status_map is
  'Estatus de la fuente -> estado de Axia, por sistema.';

alter table public.import_batches enable row level security;
alter table public.import_records enable row level security;
alter table public.catalog_aliases enable row level security;
alter table public.import_status_map enable row level security;

-- Lectura para quien puede importar.
create policy import_batches_read on public.import_batches
  for select to authenticated
  using (public.has_permission((select auth.uid()), 'data.import'));
create policy import_records_read on public.import_records
  for select to authenticated
  using (public.has_permission((select auth.uid()), 'data.import'));
create policy catalog_aliases_read on public.catalog_aliases
  for select to authenticated
  using (public.has_permission((select auth.uid()), 'data.import'));
create policy import_status_map_read on public.import_status_map
  for select to authenticated
  using (public.has_permission((select auth.uid()), 'data.import'));

-- Asegura el sistema de origen (dato, no constante de código).
create or replace function public.import_system(p_system text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_permission('data.import');
  if p_system is null or btrim(p_system) = '' then
    raise exception 'El sistema de origen es obligatorio' using errcode = 'P0001';
  end if;
  insert into public.external_systems (name) values (btrim(p_system))
  on conflict (name) do nothing;
end;
$$;
comment on function public.import_system(text) is 'Registra (idempotente) un sistema de origen.';
revoke execute on function public.import_system(text) from public, anon;
grant execute on function public.import_system(text) to authenticated;

create or replace function public.import_batch_start(
  p_system text,
  p_mode text default 'dry_run'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform public.require_permission('data.import');
  perform public.import_system(p_system);
  if p_mode not in ('dry_run', 'commit') then
    raise exception 'Modo de importación inválido' using errcode = '22023';
  end if;
  insert into public.import_batches (system, mode, created_by)
  values (btrim(p_system), p_mode, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;
comment on function public.import_batch_start(text, text) is 'Abre un lote de importación.';
revoke execute on function public.import_batch_start(text, text) from public, anon;
grant execute on function public.import_batch_start(text, text) to authenticated;

create or replace function public.import_batch_finish(
  p_batch_id uuid,
  p_status text,
  p_summary jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_permission('data.import');
  if p_status not in ('completed', 'failed') then
    raise exception 'Estado de lote inválido' using errcode = '22023';
  end if;
  update public.import_batches
  set status = p_status, summary = coalesce(p_summary, '{}'::jsonb), finished_at = now()
  where id = p_batch_id;
  if not found then
    raise exception 'El lote no existe' using errcode = 'P0001';
  end if;
end;
$$;
comment on function public.import_batch_finish(uuid, text, jsonb) is 'Cierra un lote con estado y resumen.';
revoke execute on function public.import_batch_finish(uuid, text, jsonb) from public, anon;
grant execute on function public.import_batch_finish(uuid, text, jsonb) to authenticated;

create or replace function public.import_record_add(
  p_batch_id uuid,
  p_row_number integer,
  p_raw jsonb,
  p_result text,
  p_ticket_id uuid default null,
  p_error text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform public.require_permission('data.import');
  if p_result not in ('pending', 'inserted', 'updated', 'skipped', 'error') then
    raise exception 'Resultado de fila inválido' using errcode = '22023';
  end if;
  insert into public.import_records (batch_id, row_number, raw, result, ticket_id, error)
  values (p_batch_id, p_row_number, coalesce(p_raw, '{}'::jsonb), p_result, p_ticket_id, p_error)
  returning id into v_id;
  return v_id;
end;
$$;
comment on function public.import_record_add(uuid, integer, jsonb, text, uuid, text) is 'Guarda una fila del lote con su resultado.';
revoke execute on function public.import_record_add(uuid, integer, jsonb, text, uuid, text) from public, anon;
grant execute on function public.import_record_add(uuid, integer, jsonb, text, uuid, text) to authenticated;

create or replace function public.import_alias_get(p_catalog text, p_alias text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select record_id from public.catalog_aliases
  where catalog = p_catalog and lower(alias) = lower(btrim(p_alias));
$$;
comment on function public.import_alias_get(text, text) is 'Resuelve un alias al registro del catálogo.';
revoke execute on function public.import_alias_get(text, text) from public, anon;
grant execute on function public.import_alias_get(text, text) to authenticated;

create or replace function public.import_alias_set(
  p_catalog text,
  p_alias text,
  p_record_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_permission('data.import');
  insert into public.catalog_aliases (catalog, alias, record_id)
  values (btrim(p_catalog), btrim(p_alias), p_record_id)
  on conflict (catalog, alias) do update set record_id = excluded.record_id;
end;
$$;
comment on function public.import_alias_set(text, text, uuid) is 'Crea o actualiza un alias de catálogo.';
revoke execute on function public.import_alias_set(text, text, uuid) from public, anon;
grant execute on function public.import_alias_set(text, text, uuid) to authenticated;

create or replace function public.import_status_get(p_system text, p_external_status text)
returns public.ticket_status
language sql
stable
security definer
set search_path = ''
as $$
  select ticket_status from public.import_status_map
  where system = p_system and lower(external_status) = lower(btrim(p_external_status));
$$;
comment on function public.import_status_get(text, text) is 'Traduce el estatus de la fuente al estado de Axia.';
revoke execute on function public.import_status_get(text, text) from public, anon;
grant execute on function public.import_status_get(text, text) to authenticated;

create or replace function public.import_status_set(
  p_system text,
  p_external_status text,
  p_ticket_status public.ticket_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_permission('data.import');
  perform public.import_system(p_system);
  insert into public.import_status_map (system, external_status, ticket_status)
  values (btrim(p_system), btrim(p_external_status), p_ticket_status)
  on conflict (system, external_status) do update set ticket_status = excluded.ticket_status;
end;
$$;
comment on function public.import_status_set(text, text, public.ticket_status) is 'Crea o actualiza el mapeo de estatus.';
revoke execute on function public.import_status_set(text, text, public.ticket_status) from public, anon;
grant execute on function public.import_status_set(text, text, public.ticket_status) to authenticated;

-- Upsert idempotente de un tiquet importado por (system, external_id).
create or replace function public.import_ticket_upsert(
  p_system text,
  p_external_id text,
  p_data jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_number bigint;
  v_cycle integer;
begin
  perform public.require_permission('data.import');
  if p_system is null or btrim(p_system) = '' then
    raise exception 'El sistema de origen es obligatorio' using errcode = 'P0001';
  end if;
  if p_external_id is null or btrim(p_external_id) = '' then
    raise exception 'El identificador externo es obligatorio' using errcode = 'P0001';
  end if;
  perform public.import_system(p_system);

  select ticket_id into v_id from public.ticket_external_refs
  where system = btrim(p_system) and external_id = btrim(p_external_id);

  if v_id is not null then
    update public.tickets set
      building_id = coalesce((p_data ->> 'building_id')::uuid, building_id),
      location_id = coalesce((p_data ->> 'location_id')::uuid, location_id),
      dependency_id = coalesce((p_data ->> 'dependency_id')::uuid, dependency_id),
      category_id = coalesce((p_data ->> 'category_id')::uuid, category_id),
      subcategory_id = coalesce((p_data ->> 'subcategory_id')::uuid, subcategory_id),
      problem_id = coalesce((p_data ->> 'problem_id')::uuid, problem_id),
      service_type_id = coalesce((p_data ->> 'service_type_id')::uuid, service_type_id),
      priority_id = coalesce((p_data ->> 'priority_id')::uuid, priority_id),
      channel_id = coalesce((p_data ->> 'channel_id')::uuid, channel_id),
      description = coalesce(p_data ->> 'description', description),
      requester_name = coalesce(p_data ->> 'requester_name', requester_name),
      requester_contact = coalesce(p_data ->> 'requester_contact', requester_contact),
      status = coalesce((p_data ->> 'status')::public.ticket_status, status),
      reported_at = coalesce((p_data ->> 'reported_at')::timestamptz, reported_at),
      closed_at = coalesce((p_data ->> 'closed_at')::timestamptz, closed_at)
    where id = v_id;
  else
    v_number := nullif(btrim(p_data ->> 'ticket_number'), '')::bigint;
    insert into public.tickets (
      ticket_number, building_id, location_id, dependency_id, category_id,
      subcategory_id, problem_id, service_type_id, priority_id, channel_id,
      description, requester_id, requester_name, requester_contact,
      status, reported_at, closed_at, registered_by)
    values (
      coalesce(v_number, nextval('public.tickets_number_seq')),
      (p_data ->> 'building_id')::uuid,
      (p_data ->> 'location_id')::uuid,
      (p_data ->> 'dependency_id')::uuid,
      (p_data ->> 'category_id')::uuid,
      nullif(btrim(p_data ->> 'subcategory_id'), '')::uuid,
      nullif(btrim(p_data ->> 'problem_id'), '')::uuid,
      (p_data ->> 'service_type_id')::uuid,
      (p_data ->> 'priority_id')::uuid,
      (p_data ->> 'channel_id')::uuid,
      p_data ->> 'description',
      (p_data ->> 'requester_id')::uuid,
      p_data ->> 'requester_name',
      nullif(btrim(p_data ->> 'requester_contact'), ''),
      coalesce((p_data ->> 'status')::public.ticket_status, 'registered'),
      coalesce((p_data ->> 'reported_at')::timestamptz, now()),
      nullif(btrim(p_data ->> 'closed_at'), '')::timestamptz,
      auth.uid())
    returning id into v_id;

    insert into public.ticket_external_refs (ticket_id, system, external_id)
    values (v_id, btrim(p_system), btrim(p_external_id));

    if v_number is not null then
      perform setval(
        'public.tickets_number_seq',
        greatest((select last_value from public.tickets_number_seq), v_number));
    end if;
  end if;

  select cycle into v_cycle from public.tickets where id = v_id;
  insert into public.ticket_events (
    ticket_id, cycle, type, actor_id, payload, source)
  values (
    v_id, v_cycle, 'imported', auth.uid(),
    coalesce(p_data, '{}'::jsonb)
      || jsonb_build_object('system', btrim(p_system), 'external_id', btrim(p_external_id)),
    'import');

  return v_id;
end;
$$;
comment on function public.import_ticket_upsert(text, text, jsonb) is
  'Inserta o actualiza un tiquet importado por (system, external_id); conserva el número original y continúa la secuencia.';
revoke execute on function public.import_ticket_upsert(text, text, jsonb) from public, anon;
grant execute on function public.import_ticket_upsert(text, text, jsonb) to authenticated;
