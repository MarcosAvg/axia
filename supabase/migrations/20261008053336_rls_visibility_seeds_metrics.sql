-- Tramo 8 de la Fase 1: RLS de lectura, visibilidad al solicitante y vistas de indicadores.
-- Opción (a): las RPC pasan a `security definer` con `search_path` fijo (no reescribimos sus
-- cuerpos). La RLS queda para LECTURA; el cliente solo escribe a través de las RPC, que validan
-- permiso dentro. Diseño: docs/modelo-datos.md §8.

-- 1. RPC y funciones que mutan: security definer con search_path fijo.
do $$
declare
  f text;
begin
  foreach f in array array[
    'ticket_create(jsonb, uuid)', 'ticket_take(uuid, uuid)',
    'ticket_assign_technician(uuid, uuid, uuid, uuid)',
    'ticket_start(uuid, uuid)', 'ticket_attend(uuid, text, uuid)',
    'ticket_validate(uuid, uuid)', 'ticket_reject(uuid, uuid, text, uuid)',
    'ticket_cancel(uuid, uuid, text, uuid)',
    'ticket_change_priority(uuid, uuid, uuid)', 'ticket_comment(uuid, text, boolean, uuid)',
    'ticket_pause(uuid, uuid, text, date, uuid)',
    'ticket_advance_pause(uuid, uuid, text, uuid)', 'ticket_resume(uuid, uuid)',
    'ticket_recapture(uuid, jsonb, uuid, uuid)', 'ticket_open_claim(uuid, uuid, text, uuid)',
    'ticket_resolve_claim(uuid, claim_resolution, uuid, text, uuid)',
    'ticket_mark_duplicate(uuid, uuid, uuid)', 'ticket_reactivate(uuid, uuid, uuid)',
    'time_span_record(uuid, time_span_kind, timestamptz, timestamptz, clock_class, uuid)',
    'notification_mark_read(uuid)',
    'write_event(uuid, event_type, jsonb, uuid, uuid, uuid, uuid)',
    'ticket_route(uuid)', 'ticket_detect_duplicates(uuid)', 'notify_event(bigint)'
  ]
  loop
    execute format('alter function public.%s security definer', f);
    execute format('alter function public.%s set search_path to public, extensions, pg_temp', f);
    execute format('revoke execute on function public.%s from public', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;

-- has_permission ya es definer; fijamos también su search_path (ya vacío) y el de can_see_ticket.

-- 2. Integración genérica (agnóstica): sistemas externos e identificadores.
create table public.external_systems (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.external_systems is
  'Catálogo genérico de sistemas externos (solo el nombre; el núcleo no conoce sus valores).';

create table public.ticket_external_refs (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  system text not null references public.external_systems (name),
  external_id text not null,
  created_at timestamptz not null default now(),
  unique (system, external_id)
);
comment on table public.ticket_external_refs is
  'Identificadores de un tiquet en otros sistemas. Núcleo agnóstico (ADR 0006).';

create trigger external_systems_set_updated_at before update on public.external_systems
  for each row execute function public.set_updated_at();

alter table public.external_systems enable row level security;
alter table public.ticket_external_refs enable row level security;

-- 2b. ¿Puede el usuario ver este tiquet? (ámbito: todos, propio, equipo, edificios).
create or replace function public.can_see_ticket(p_ticket_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.tickets t
    where t.id = p_ticket_id
      and public.has_permission(auth.uid(), 'ticket.view')
      and (
        exists (
          select 1 from public.user_roles ur
          join public.role_permissions rp on rp.role_id = ur.role_id
          where ur.user_id = auth.uid()
            and rp.permission_id = 'ticket.view' and rp.scope = 'all'
        )
        or exists (
          select 1 from public.requesters r
          where r.id = t.requester_id and r.user_id = auth.uid()
        )
        or exists (
          select 1 from public.ticket_assignments a
          join public.technicians te on te.id = a.assignee_technician_id
          where a.ticket_id = t.id and a.ended_at is null and te.user_id = auth.uid()
        )
        or exists (
          select 1 from public.ticket_assignments a
          where a.ticket_id = t.id and a.ended_at is null and a.assignee_user_id = auth.uid()
        )
        or exists (
          select 1 from public.supervisor_scopes ss
          join public.supervisor_scope_buildings ssb on ssb.scope_id = ss.id
          where ss.user_id = auth.uid() and ss.team_id = t.team_id
            and ssb.building_id = t.building_id
        )
      )
  );
$$;
comment on function public.can_see_ticket(uuid) is
  'Verdadero si el usuario puede ver el tiquet según su permiso y ámbito (RN-23).';
revoke execute on function public.can_see_ticket(uuid) from public;
grant execute on function public.can_see_ticket(uuid) to authenticated;

-- 3. Políticas de LECTURA.
-- 3a. Catálogos y datos de referencia: lectura para autenticados.
do $$
declare
  t text;
begin
  foreach t in array array[
    'teams', 'buildings', 'locations', 'dependencies', 'categories', 'subcategories',
    'problems', 'service_types', 'priorities', 'channels', 'reasons', 'work_calendars',
    'work_calendar_intervals', 'work_calendar_holidays', 'instance_settings', 'roles',
    'permissions', 'role_permissions', 'profiles', 'requesters', 'technicians',
    'technician_categories', 'supervisor_scopes', 'supervisor_scope_buildings',
    'external_systems', 'notification_rules', 'escalation_rules', 'user_roles'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (true)',
      t || '_read', t);
  end loop;
end;
$$;

-- 3b. Tiquets y sus tablas: solo si el usuario puede ver el tiquet.
create policy tickets_read on public.tickets
  for select to authenticated using (public.can_see_ticket(id));

do $$
declare
  t text;
begin
  foreach t in array array[
    'ticket_events', 'ticket_assignments', 'ticket_offers', 'ticket_participants',
    'ticket_captures', 'ticket_pauses', 'ticket_claims', 'ticket_links',
    'ticket_duplicate_candidates', 'ticket_validations', 'evidence', 'time_spans',
    'ticket_external_refs'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.can_see_ticket(ticket_id))',
      t || '_read', t);
  end loop;
end;
$$;

create policy ticket_pause_steps_read on public.ticket_pause_steps
  for select to authenticated
  using (exists (
    select 1 from public.ticket_pauses p
    where p.id = pause_id and public.can_see_ticket(p.ticket_id)
  ));

create policy notifications_read on public.notifications
  for select to authenticated using (recipient_user_id = auth.uid());

-- 4. Visibilidad al solicitante: solo los tipos de evento configurados.
create or replace view public.v_ticket_events_requester
with (security_invoker = true)
as
select e.id, e.ticket_id, e.cycle, e.type, e.payload, e.occurred_at, e.recorded_at
from public.ticket_events e
join public.tickets t on t.id = e.ticket_id
join public.requesters r on r.id = t.requester_id
where r.user_id = auth.uid()
  and e.type in (
    select unnest(requester_visible_event_types) from public.instance_settings
  );
comment on view public.v_ticket_events_requester is
  'Eventos visibles al solicitante (RN-23).';
grant select on public.v_ticket_events_requester to authenticated;

-- 5. Vista base de indicadores (excluye duplicados).
create or replace view public.v_ticket_metrics_base
with (security_invoker = true)
as
select
  t.id,
  t.ticket_number,
  t.folio,
  t.status,
  t.building_id,
  t.category_id,
  t.priority_id,
  t.team_id,
  t.reported_at,
  t.closed_at,
  public.ticket_time_total(t.id) as total_time,
  public.ticket_time_net(t.id) as net_time,
  public.ticket_time_by_kind(t.id, 'active_work') as active_work_time
from public.tickets t
where t.status <> 'duplicate';
comment on view public.v_ticket_metrics_base is
  'Indicadores base por tiquet (excluye duplicados). Ver docs/modelo-datos.md §10.';
grant select on public.v_ticket_metrics_base to authenticated;
