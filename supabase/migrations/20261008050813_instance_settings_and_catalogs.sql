-- Tramo 1 de la Fase 1: configuración de la instancia, catálogos maestros y motivos jerárquicos.
-- Fuente de verdad del negocio: docs/especificacion-negocio.md. Diseño: docs/modelo-datos.md.
-- RLS se habilita en cada tabla aquí; las políticas se completan en el tramo 8.

create extension if not exists pg_trgm with schema extensions;

-- Enumeraciones fijas que se necesitan en este tramo (el resto llegan en su tramo).
create type public.reason_use as enum (
  'pause', 'rejection', 'cancellation', 'supervisor_reassignment',
  'technician_reassignment', 'recapture', 'claim', 'claim_outcome',
  'reactivation', 'auxiliary_support'
);
create type public.clock_class as enum ('counted', 'not_counted');
-- Tipos de evento de la bitácora; se usan en eventos y en la configuración de visibilidad.
create type public.event_type as enum (
  'created', 'offered', 'taken', 'reassigned_supervisor', 'assigned_technician',
  'reassigned_technician', 'auxiliary_added', 'capture_recaptured', 'started',
  'paused', 'pause_advanced', 'resumed', 'attended', 'validated', 'claim_opened',
  'claim_resolved', 'reopened', 'rejected', 'cancelled', 'duplicate_marked',
  'reactivated', 'priority_changed', 'comment', 'evidence_added', 'imported'
);

-- Disparador común para updated_at.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Configuración de la instancia (una sola fila por base).
create table public.instance_settings (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique check (singleton),
  team_label text not null default 'Equipo',
  validation_policy text not null default 'both'
    check (validation_policy in ('requester', 'supervisor', 'both')),
  auto_validation_days integer check (auto_validation_days is null or auto_validation_days > 0),
  claim_window interval not null default interval '1 day',
  duplicate_window interval not null default interval '7 days',
  duplicate_similarity numeric(4, 3) not null default 0.300
    check (duplicate_similarity between 0 and 1),
  duplicate_shown_fields text[] not null
    default '{folio,status,reported_at,building,problem,requester_contact}',
  folio_pattern text not null default 'AX-{yyyy}-{num}',
  timezone text not null default 'America/Mexico_City',
  default_calendar_id uuid,
  request_evidence_policy text not null default 'recommended'
    check (request_evidence_policy in ('optional', 'recommended', 'required')),
  requester_visible_event_types public.event_type[] not null
    default '{created,taken,assigned_technician,started,paused,resumed,attended,validated,claim_opened,claim_resolved,reopened,rejected,cancelled,duplicate_marked}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.instance_settings is
  'Configuración de la instancia (una fila por base). Ver docs/modelo-datos.md §3.1.';

create table public.work_calendars (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  timezone text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.work_calendars is 'Jornadas laborales configurables (turnos).';

create table public.work_calendar_intervals (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.work_calendars (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (start_time < end_time)
);
comment on table public.work_calendar_intervals is
  'Franjas semanales del calendario (0=domingo … 6=sábado).';

create table public.work_calendar_holidays (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.work_calendars (id) on delete cascade,
  holiday date not null,
  name text,
  unique (calendar_id, holiday)
);
comment on table public.work_calendar_holidays is 'Días no laborables del calendario.';

alter table public.instance_settings
  add constraint instance_settings_default_calendar_id_fkey
  foreign key (default_calendar_id) references public.work_calendars (id);

-- Catálogos maestros.
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.teams is 'Equipos que atienden (mantenimiento, seguridad…).';

create table public.buildings (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings (id),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (building_id, name)
);

create table public.dependencies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, name)
);

create table public.subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, name)
);

create table public.problems (
  id uuid primary key default gen_random_uuid(),
  subcategory_id uuid not null references public.subcategories (id),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subcategory_id, name)
);

create table public.service_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.priorities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  position smallint not null default 0,
  target_minutes integer check (target_minutes is null or target_minutes > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.priorities.target_minutes is
  'Tiempo objetivo opcional. Dejar NULL si la institución no define SLA todavía.';

create table public.channels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Motivos jerárquicos por tipo de uso (profundidad ilimitada).
create table public.reasons (
  id uuid primary key default gen_random_uuid(),
  use public.reason_use not null,
  parent_id uuid references public.reasons (id),
  name text not null,
  position smallint not null default 0,
  requires_note boolean not null default false,
  allows_estimated_date boolean not null default false,
  clock_class public.clock_class not null default 'counted',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (use, parent_id, name)
);
comment on table public.reasons is
  'Motivos jerárquicos por uso (pausa, rechazo, reclamación…). Ver docs/modelo-datos.md §3.3.';
comment on column public.reasons.clock_class is
  'Clasificación de reloj del nodo; se copia al tramo al crearse.';

-- El hijo hereda el uso del padre.
create or replace function public.reasons_enforce_same_use()
returns trigger
language plpgsql
as $$
declare
  parent_use public.reason_use;
begin
  if new.parent_id is not null then
    select r.use into parent_use from public.reasons r where r.id = new.parent_id;
    if parent_use is null then
      raise exception 'El motivo padre % no existe', new.parent_id;
    end if;
    if parent_use <> new.use then
      raise exception 'El motivo hijo (%) debe tener el uso del padre (%)', new.use, parent_use;
    end if;
  end if;
  return new;
end;
$$;

create trigger reasons_enforce_same_use
  before insert or update on public.reasons
  for each row execute function public.reasons_enforce_same_use();

-- Disparadores de updated_at.
do $$
declare
  t text;
begin
  foreach t in array array[
    'instance_settings', 'work_calendars', 'teams', 'buildings', 'locations',
    'dependencies', 'categories', 'subcategories', 'problems', 'service_types',
    'priorities', 'channels', 'reasons'
  ]
  loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t
    );
  end loop;
end;
$$;

-- RLS habilitado en todas las tablas de este tramo (políticas en el tramo 8).
do $$
declare
  t text;
begin
  foreach t in array array[
    'instance_settings', 'work_calendars', 'work_calendar_intervals',
    'work_calendar_holidays', 'teams', 'buildings', 'locations', 'dependencies',
    'categories', 'subcategories', 'problems', 'service_types', 'priorities',
    'channels', 'reasons'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;
