-- Tramo 3 de la Fase 1: tiquets, folio, historial, participantes y evidencias.
-- Diseño: docs/modelo-datos.md §3.4. Los actores pueden ser NULL en acciones de sistema o
-- importación (event_source 'import'/'integration').

create type public.ticket_status as enum (
  'registered', 'with_supervisor', 'assigned', 'in_progress', 'paused',
  'attended', 'under_claim', 'closed', 'rejected', 'cancelled', 'duplicate'
);
create type public.assignment_stage as enum ('supervisor', 'technician');
create type public.participation_type as enum ('leader', 'auxiliary');
create type public.evidence_type as enum ('request', 'before', 'during', 'after', 'claim', 'other');
create type public.event_source as enum ('app', 'import', 'integration');
create type public.span_origin as enum ('system', 'manual');

-- Número consecutivo global (RN-25): nunca se usa max(); la secuencia es la fuente.
create sequence public.tickets_number_seq;

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number bigint not null unique default nextval('public.tickets_number_seq'),
  folio text not null unique,
  status public.ticket_status not null default 'registered',
  cycle integer not null default 1 check (cycle > 0),
  team_id uuid not null references public.teams (id),
  building_id uuid not null references public.buildings (id),
  location_id uuid not null references public.locations (id),
  dependency_id uuid not null references public.dependencies (id),
  category_id uuid not null references public.categories (id),
  subcategory_id uuid references public.subcategories (id),
  problem_id uuid references public.problems (id),
  service_type_id uuid not null references public.service_types (id),
  priority_id uuid not null references public.priorities (id),
  channel_id uuid not null references public.channels (id),
  description text not null,
  requester_id uuid not null references public.requesters (id),
  requester_name text not null,
  requester_contact text,
  registered_by uuid references auth.users (id),
  reported_at timestamptz not null default now(),
  closed_at timestamptz,
  possible_duplicate boolean not null default false,
  duplicate_of_id uuid references public.tickets (id),
  status_before_discard public.ticket_status,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.tickets is 'Tiquets del núcleo. Ver docs/modelo-datos.md §3.4.';
comment on column public.tickets.team_id is 'Instantánea del equipo de la categoría (RN-02).';
comment on column public.tickets.folio is 'Folio legible por patrón; inmutable (RN-25).';
comment on column public.tickets.status_before_discard is 'Estado previo al descarte, para la reactivación.';

create table public.ticket_events (
  id bigint generated always as identity primary key,
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  cycle integer not null check (cycle > 0),
  type public.event_type not null,
  actor_id uuid references auth.users (id),
  subject_user_id uuid references auth.users (id),
  subject_technician_id uuid references public.technicians (id),
  reason_id uuid references public.reasons (id),
  payload jsonb not null default '{}'::jsonb,
  source public.event_source not null default 'app',
  client_request_id uuid unique,
  occurred_at timestamptz not null default now(),
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
comment on table public.ticket_events is
  'Bitácora de solo agregar. actor_id = quién; subject_* = a nombre de quién (proxy).';

create table public.ticket_assignments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  cycle integer not null check (cycle > 0),
  stage public.assignment_stage not null,
  assignee_user_id uuid references auth.users (id),
  assignee_technician_id uuid references public.technicians (id),
  assigned_by uuid references auth.users (id),
  assigned_at timestamptz not null default now(),
  ended_at timestamptz,
  reason_id uuid references public.reasons (id),
  note text,
  client_request_id uuid unique,
  created_at timestamptz not null default now(),
  constraint ticket_assignments_assignee_check check (
    (stage = 'supervisor' and assignee_user_id is not null and assignee_technician_id is null)
    or (stage = 'technician' and assignee_technician_id is not null)
  )
);
comment on table public.ticket_assignments is
  'Cada salto de la cadena. stage supervisor → usuario; technician → catálogo de técnicos.';

create table public.ticket_participants (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  cycle integer not null check (cycle > 0),
  technician_id uuid not null references public.technicians (id),
  participation_type public.participation_type not null,
  category_id uuid references public.categories (id),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  origin public.span_origin not null default 'system',
  recorded_by uuid references auth.users (id),
  client_request_id uuid unique,
  created_at timestamptz not null default now()
);
comment on table public.ticket_participants is
  'Participación (líder o auxiliar) por tiquet y categoría, para medir horas (RN-09).';

create table public.ticket_captures (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  cycle integer not null check (cycle > 0),
  changed_by uuid references auth.users (id),
  changed_at timestamptz not null default now(),
  reason_id uuid references public.reasons (id),
  changes jsonb not null,
  created_at timestamptz not null default now()
);
comment on table public.ticket_captures is
  'Recapturas: versión aplicada sobre el mismo tiquet, con el original y cada versión.';

create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  cycle integer not null check (cycle > 0),
  event_id bigint references public.ticket_events (id),
  type public.evidence_type not null,
  storage_path text,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  captured_by_technician_id uuid references public.technicians (id),
  captured_by_user_id uuid references auth.users (id),
  uploaded_by uuid references auth.users (id),
  occurred_at timestamptz not null default now(),
  recorded_at timestamptz not null default now(),
  client_request_id uuid unique,
  created_at timestamptz not null default now()
);
comment on table public.evidence is
  'Evidencias por evento (request, before, during, after, claim, other). Nunca se borran.';

create table public.idempotency_keys (
  client_request_id uuid primary key,
  actor_id uuid references auth.users (id),
  operation text not null,
  created_at timestamptz not null default now()
);
comment on table public.idempotency_keys is
  'Claves de idempotencia de acciones del cliente (RN-27).';

-- Folio a partir del patrón configurable.
create or replace function public.tickets_set_folio()
returns trigger
language plpgsql
as $$
declare
  pattern text;
  tz text;
  year_text text;
begin
  select folio_pattern, timezone into pattern, tz
  from public.instance_settings limit 1;
  pattern := coalesce(pattern, 'AX-{yyyy}-{num}');
  tz := coalesce(tz, 'UTC');
  year_text := to_char(new.reported_at at time zone tz, 'YYYY');
  new.folio := replace(replace(pattern, '{yyyy}', year_text), '{num}', new.ticket_number::text);
  return new;
end;
$$;

create trigger tickets_set_folio
  before insert on public.tickets
  for each row execute function public.tickets_set_folio();

-- Coherencia de la clasificación y equipo derivado de la categoría.
create or replace function public.tickets_check_classification()
returns trigger
language plpgsql
as $$
declare
  loc_building uuid;
  sub_category uuid;
  prb_subcategory uuid;
begin
  if new.team_id is null then
    select team_id into new.team_id from public.categories where id = new.category_id;
  end if;

  select building_id into loc_building from public.locations where id = new.location_id;
  if loc_building is null or loc_building <> new.building_id then
    raise exception 'La ubicación % no pertenece al edificio %', new.location_id, new.building_id;
  end if;

  if new.subcategory_id is not null then
    select category_id into sub_category from public.subcategories where id = new.subcategory_id;
    if sub_category is null or sub_category <> new.category_id then
      raise exception 'La subcategoría % no pertenece a la categoría %',
        new.subcategory_id, new.category_id;
    end if;
  end if;

  if new.problem_id is not null then
    if new.subcategory_id is null then
      raise exception 'No se puede indicar un problema sin subcategoría';
    end if;
    select subcategory_id into prb_subcategory from public.problems where id = new.problem_id;
    if prb_subcategory is null or prb_subcategory <> new.subcategory_id then
      raise exception 'El problema % no pertenece a la subcategoría %',
        new.problem_id, new.subcategory_id;
    end if;
  end if;

  return new;
end;
$$;

create trigger tickets_check_classification
  before insert or update on public.tickets
  for each row execute function public.tickets_check_classification();

-- Folio y número inmutables.
create or replace function public.tickets_immutable_fields()
returns trigger
language plpgsql
as $$
begin
  if new.folio <> old.folio then
    raise exception 'El folio no puede cambiar';
  end if;
  if new.ticket_number <> old.ticket_number then
    raise exception 'El número de tiquet no puede cambiar';
  end if;
  return new;
end;
$$;

create trigger tickets_immutable_fields
  before update on public.tickets
  for each row execute function public.tickets_immutable_fields();

-- Bitácora de solo agregar.
create or replace function public.prevent_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'La tabla % es de solo agregar', tg_table_name;
end;
$$;

create trigger ticket_events_no_mutation
  before update or delete on public.ticket_events
  for each row execute function public.prevent_mutation();

create trigger evidence_no_delete
  before delete on public.evidence
  for each row execute function public.prevent_mutation();

-- Índices previsibles.
create index idx_tickets_status on public.tickets (status);
create index idx_tickets_building on public.tickets (building_id);
create index idx_tickets_category on public.tickets (category_id);
create index idx_tickets_reported_at on public.tickets (reported_at);
create index idx_ticket_events_ticket on public.ticket_events (ticket_id);
create index idx_ticket_assignments_ticket on public.ticket_assignments (ticket_id);
create index idx_ticket_participants_ticket on public.ticket_participants (ticket_id);
create index idx_evidence_ticket on public.evidence (ticket_id);

-- updated_at y RLS.
create trigger tickets_set_updated_at before update on public.tickets
  for each row execute function public.set_updated_at();

alter table public.tickets enable row level security;
alter table public.ticket_events enable row level security;
alter table public.ticket_assignments enable row level security;
alter table public.ticket_participants enable row level security;
alter table public.ticket_captures enable row level security;
alter table public.evidence enable row level security;
alter table public.idempotency_keys enable row level security;
