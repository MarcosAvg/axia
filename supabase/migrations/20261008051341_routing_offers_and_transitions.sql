-- Tramo 4 de la Fase 1: ruteo, ofertas, detección de posibles duplicados y RPC del flujo núcleo.
-- Diseño: docs/modelo-datos.md §4, §5, §6. Las RPC son `security invoker`: la RLS del tramo 8
-- limita el acceso; aquí se valida el permiso con has_permission y la idempotencia con
-- client_request_id.

create type public.offer_status as enum ('offered', 'taken', 'withdrawn');

create table public.ticket_offers (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  cycle integer not null check (cycle > 0),
  supervisor_user_id uuid not null references auth.users (id),
  status public.offer_status not null default 'offered',
  offered_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (ticket_id, cycle, supervisor_user_id)
);
comment on table public.ticket_offers is
  'Oferta del tiquet a cada supervisor candidato (RN-03/RN-05).';

create table public.ticket_duplicate_candidates (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  candidate_ticket_id uuid not null references public.tickets (id),
  similarity numeric(4, 3) not null,
  shown_at timestamptz not null default now(),
  decision text check (decision in ('ignored', 'linked', 'dismissed')),
  unique (ticket_id, candidate_ticket_id)
);
comment on table public.ticket_duplicate_candidates is
  'Candidatos a duplicado mostrados al registrar (RN-29). No bloquea.';

create table public.ticket_validations (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  cycle integer not null check (cycle > 0),
  validator_user_id uuid references auth.users (id),
  validator_role text not null check (validator_role in ('requester', 'supervisor')),
  validated_at timestamptz not null default now(),
  unique (ticket_id, cycle, validator_role)
);
comment on table public.ticket_validations is
  'Validaciones por rol (requester/supervisor) para cumplir la política (RN-15).';

create index idx_tickets_description_trgm
  on public.tickets using gin (description extensions.gin_trgm_ops);
create index idx_ticket_offers_ticket on public.ticket_offers (ticket_id, cycle);
create index idx_ticket_duplicate_candidates_ticket
  on public.ticket_duplicate_candidates (ticket_id);

alter table public.ticket_offers enable row level security;
alter table public.ticket_duplicate_candidates enable row level security;
alter table public.ticket_validations enable row level security;

-- Permisos: ¿tiene el usuario este permiso (en cualquier ámbito)?
create or replace function public.has_permission(p_user_id uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.roles r on r.id = ur.role_id and r.active
    where ur.user_id = p_user_id and rp.permission_id = p_permission
  );
$$;
comment on function public.has_permission(uuid, text) is
  'Permiso efectivo del usuario. security definer para leer roles sin depender de la RLS.';
revoke execute on function public.has_permission(uuid, text) from public;
grant execute on function public.has_permission(uuid, text) to authenticated;

create or replace function public.require_permission(p_permission text)
returns void
language plpgsql
stable
as $$
begin
  if not public.has_permission(auth.uid(), p_permission) then
    raise exception 'Permiso insuficiente: %', p_permission using errcode = '42501';
  end if;
end;
$$;
comment on function public.require_permission(text) is 'Lanza excepción si el usuario no tiene el permiso.';

-- Registra un evento en la bitácora.
create or replace function public.write_event(
  p_ticket_id uuid,
  p_type public.event_type,
  p_payload jsonb default '{}'::jsonb,
  p_reason_id uuid default null,
  p_subject_user_id uuid default null,
  p_subject_technician_id uuid default null,
  p_client_request_id uuid default null
)
returns void
language plpgsql
as $$
declare
  v_cycle integer;
begin
  select cycle into v_cycle from public.tickets where id = p_ticket_id;
  insert into public.ticket_events (
    ticket_id, cycle, type, actor_id, subject_user_id, subject_technician_id,
    reason_id, payload, client_request_id)
  values (
    p_ticket_id, v_cycle, p_type, auth.uid(), p_subject_user_id, p_subject_technician_id,
    p_reason_id, coalesce(p_payload, '{}'::jsonb), p_client_request_id);
end;
$$;

-- ¿La petición ya se procesó? (idempotencia)
create or replace function public.request_already_handled(p_client_request_id uuid)
returns boolean
language sql
stable
as $$
  select p_client_request_id is not null and exists (
    select 1 from public.ticket_events where client_request_id = p_client_request_id
  );
$$;

-- Ruteo: crea una oferta por supervisor candidato (equipo del tiquet y edificio).
create or replace function public.ticket_route(p_ticket_id uuid)
returns void
language plpgsql
as $$
declare
  v_ticket public.tickets;
begin
  select * into v_ticket from public.tickets where id = p_ticket_id;
  insert into public.ticket_offers (ticket_id, cycle, supervisor_user_id)
  select v_ticket.id, v_ticket.cycle, ss.user_id
  from public.supervisor_scopes ss
  join public.supervisor_scope_buildings ssb on ssb.scope_id = ss.id
  where ss.team_id = v_ticket.team_id
    and ssb.building_id = v_ticket.building_id
    and ss.active
    and exists (select 1 from public.profiles pr where pr.id = ss.user_id and pr.active)
  on conflict do nothing;
end;
$$;

-- Detección de posibles duplicados al registrar.
create or replace function public.ticket_detect_duplicates(p_ticket_id uuid)
returns void
language plpgsql
as $$
declare
  v public.tickets;
  v_window interval;
  v_similarity numeric;
begin
  select * into v from public.tickets where id = p_ticket_id;
  select duplicate_window, duplicate_similarity into v_window, v_similarity
  from public.instance_settings limit 1;

  insert into public.ticket_duplicate_candidates (ticket_id, candidate_ticket_id, similarity)
  select v.id, t.id, extensions.similarity(t.description, v.description)
  from public.tickets t
  where t.id <> v.id
    and t.status not in ('closed', 'rejected', 'cancelled', 'duplicate')
    and t.building_id = v.building_id
    and (t.problem_id is not distinct from v.problem_id or t.category_id = v.category_id)
    and t.reported_at > now() - v_window
    and extensions.similarity(t.description, v.description) >= v_similarity
  on conflict do nothing;

  update public.tickets
  set possible_duplicate = true
  where id = v.id
    and exists (select 1 from public.ticket_duplicate_candidates c where c.ticket_id = v.id);
end;
$$;

-- Registro de tiquet (RN-01).
create or replace function public.ticket_create(
  p_data jsonb,
  p_client_request_id uuid default null
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
  v_requester public.requesters;
  v_created_by_on_behalf boolean := false;
begin
  if public.request_already_handled(p_client_request_id) then
    select ticket_id into v_id from public.ticket_events
      where client_request_id = p_client_request_id;
    return v_id;
  end if;

  select * into v_requester from public.requesters where id = (p_data ->> 'requester_id')::uuid;
  v_created_by_on_behalf := v_requester.user_id is distinct from auth.uid();
  if v_created_by_on_behalf then
    perform public.require_permission('ticket.create_on_behalf');
  else
    perform public.require_permission('ticket.create');
  end if;

  insert into public.tickets (
    building_id, location_id, dependency_id, category_id, subcategory_id, problem_id,
    service_type_id, priority_id, channel_id, description, requester_id, requester_name,
    requester_contact, registered_by)
  values (
    (p_data ->> 'building_id')::uuid,
    (p_data ->> 'location_id')::uuid,
    (p_data ->> 'dependency_id')::uuid,
    (p_data ->> 'category_id')::uuid,
    (p_data ->> 'subcategory_id')::uuid,
    (p_data ->> 'problem_id')::uuid,
    (p_data ->> 'service_type_id')::uuid,
    (p_data ->> 'priority_id')::uuid,
    (p_data ->> 'channel_id')::uuid,
    p_data ->> 'description',
    v_requester.id,
    coalesce(p_data ->> 'requester_name', v_requester.full_name),
    coalesce(p_data ->> 'requester_contact', v_requester.contact),
    auth.uid())
  returning id into v_id;

  perform public.write_event(
    v_id, 'created', jsonb_build_object('on_behalf', v_created_by_on_behalf),
    null, null, null, p_client_request_id);

  perform public.ticket_route(v_id);
  perform public.ticket_detect_duplicates(v_id);
  return v_id;
end;
$$;

-- Tomar un tiquet ofrecido (RN-05).
create or replace function public.ticket_take(
  p_ticket_id uuid, p_client_request_id uuid default null)
returns void
language plpgsql
as $$
begin
  if public.request_already_handled(p_client_request_id) then return; end if;
  perform public.require_permission('ticket.take_offer');

  if not exists (
    select 1 from public.ticket_offers
    where ticket_id = p_ticket_id and supervisor_user_id = auth.uid() and status = 'offered'
  ) then
    raise exception 'No tienes una oferta activa para este tiquet' using errcode = '42501';
  end if;

  update public.tickets set status = 'with_supervisor'
  where id = p_ticket_id and status = 'registered';
  if not found then
    raise exception 'El tiquet no está en estado registrado' using errcode = 'P0001';
  end if;

  update public.ticket_offers
  set status = (case when supervisor_user_id = auth.uid() then 'taken' else 'withdrawn' end)::public.offer_status,
      resolved_at = now()
  where ticket_id = p_ticket_id and status = 'offered';

  insert into public.ticket_assignments (
    ticket_id, cycle, stage, assignee_user_id, assigned_by)
  select id, cycle, 'supervisor', auth.uid(), auth.uid()
  from public.tickets where id = p_ticket_id;

  perform public.write_event(p_ticket_id, 'taken', '{}'::jsonb, null, null, null, p_client_request_id);
end;
$$;

-- Asignar técnico (RN-07). Implica tomar el tiquet.
create or replace function public.ticket_assign_technician(
  p_ticket_id uuid, p_technician_id uuid,
  p_reason_id uuid default null, p_client_request_id uuid default null)
returns void
language plpgsql
as $$
declare
  v_ticket public.tickets;
  v_designated boolean;
begin
  if public.request_already_handled(p_client_request_id) then return; end if;
  perform public.require_permission('ticket.assign_technician');

  select * into v_ticket from public.tickets where id = p_ticket_id;
  if v_ticket.status not in ('registered', 'with_supervisor', 'assigned') then
    raise exception 'No se puede asignar técnico en el estado %', v_ticket.status using errcode = 'P0001';
  end if;

  -- Cierra la asignación de técnico anterior, si había.
  update public.ticket_assignments set ended_at = now()
  where ticket_id = p_ticket_id and stage = 'technician' and ended_at is null;

  -- Si venía de un registro, se retiran las ofertas.
  update public.ticket_offers
  set status = 'withdrawn', resolved_at = now()
  where ticket_id = p_ticket_id and status = 'offered';

  update public.tickets
  set status = 'assigned',
      cycle = case when cycle is null then 1 else cycle end
  where id = p_ticket_id;

  insert into public.ticket_assignments (
    ticket_id, cycle, stage, assignee_technician_id, assigned_by, reason_id)
  values (p_ticket_id, v_ticket.cycle, 'technician', p_technician_id, auth.uid(), p_reason_id);

  select exists (
    select 1 from public.technician_categories
    where technician_id = p_technician_id and category_id = v_ticket.category_id
  ) into v_designated;

  insert into public.ticket_participants (
    ticket_id, cycle, technician_id, participation_type, category_id)
  values (
    p_ticket_id, v_ticket.cycle, p_technician_id,
    case when v_designated then 'leader'::public.participation_type
         else 'auxiliary'::public.participation_type end,
    v_ticket.category_id);

  perform public.write_event(
    p_ticket_id, 'assigned_technician',
    jsonb_build_object('technician_id', p_technician_id, 'auxiliary', not v_designated),
    p_reason_id, null, p_technician_id, p_client_request_id);
end;
$$;

-- Iniciar (RN-12): exige evidencia 'before' del ciclo actual.
create or replace function public.ticket_start(
  p_ticket_id uuid, p_client_request_id uuid default null)
returns void
language plpgsql
as $$
declare
  v_cycle integer;
begin
  if public.request_already_handled(p_client_request_id) then return; end if;
  perform public.require_permission('ticket.start');

  select cycle into v_cycle from public.tickets where id = p_ticket_id and status = 'assigned';
  if v_cycle is null then
    raise exception 'El tiquet no está asignado' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.evidence
    where ticket_id = p_ticket_id and cycle = v_cycle and type = 'before'
  ) then
    raise exception 'Falta la evidencia "before" del ciclo' using errcode = 'P0001';
  end if;

  update public.tickets set status = 'in_progress' where id = p_ticket_id;
  perform public.write_event(p_ticket_id, 'started', '{}'::jsonb, null, null, null, p_client_request_id);
end;
$$;

-- Atendido (RN-14): exige evidencia 'after'.
create or replace function public.ticket_attend(
  p_ticket_id uuid, p_work_description text, p_client_request_id uuid default null)
returns void
language plpgsql
as $$
declare
  v_cycle integer;
begin
  if public.request_already_handled(p_client_request_id) then return; end if;
  perform public.require_permission('ticket.attend');

  select cycle into v_cycle from public.tickets where id = p_ticket_id and status = 'in_progress';
  if v_cycle is null then
    raise exception 'El tiquet no está en proceso' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.evidence
    where ticket_id = p_ticket_id and cycle = v_cycle and type = 'after'
  ) then
    raise exception 'Falta la evidencia "after" del ciclo' using errcode = 'P0001';
  end if;

  update public.tickets set status = 'attended' where id = p_ticket_id;
  perform public.write_event(
    p_ticket_id, 'attended', jsonb_build_object('work_description', p_work_description),
    null, null, null, p_client_request_id);
end;
$$;

-- Validación (RN-15) según la política de la instancia.
create or replace function public.ticket_validate(
  p_ticket_id uuid, p_client_request_id uuid default null)
returns void
language plpgsql
as $$
declare
  v public.tickets;
  v_policy text;
  v_requester_user uuid;
  v_role text;
  v_has_requester boolean := false;
  v_has_supervisor boolean := false;
  v_close boolean := false;
begin
  if public.request_already_handled(p_client_request_id) then return; end if;

  select * into v from public.tickets where id = p_ticket_id and status = 'attended';
  if v.id is null then
    raise exception 'El tiquet no está pendiente de validación' using errcode = 'P0001';
  end if;

  select validation_policy into v_policy from public.instance_settings limit 1;
  select user_id into v_requester_user from public.requesters where id = v.requester_id;

  if v_requester_user is not null and v_requester_user = auth.uid() then
    v_role := 'requester';
    if not public.has_permission(auth.uid(), 'ticket.validate') then
      raise exception 'Permiso insuficiente: ticket.validate' using errcode = '42501';
    end if;
  else
    perform public.require_permission('ticket.validate');
    if v_requester_user is not null and v_requester_user <> auth.uid()
       and not public.has_permission(auth.uid(), 'ticket.validate_on_behalf') then
      -- Validar a nombre del solicitante requiere el permiso específico.
      raise exception 'Permiso insuficiente: ticket.validate_on_behalf' using errcode = '42501';
    end if;
    v_role := 'supervisor';
  end if;

  insert into public.ticket_validations (ticket_id, cycle, validator_user_id, validator_role)
  values (p_ticket_id, v.cycle, auth.uid(), v_role)
  on conflict (ticket_id, cycle, validator_role) do nothing;

  select exists (select 1 from public.ticket_validations
    where ticket_id = p_ticket_id and cycle = v.cycle and validator_role = 'requester')
    into v_has_requester;
  select exists (select 1 from public.ticket_validations
    where ticket_id = p_ticket_id and cycle = v.cycle and validator_role = 'supervisor')
    into v_has_supervisor;

  v_close := case v_policy
    when 'requester' then v_has_requester
    when 'supervisor' then v_has_supervisor
    else v_has_requester and v_has_supervisor
  end;

  if v_close then
    update public.tickets set status = 'closed', closed_at = now() where id = p_ticket_id;
    perform public.write_event(p_ticket_id, 'validated', '{}'::jsonb, null, null, null, p_client_request_id);
  else
    perform public.write_event(p_ticket_id, 'validated',
      jsonb_build_object('partial', true, 'role', v_role), null, null, null, p_client_request_id);
  end if;
end;
$$;

-- Rechazo (RN-19).
create or replace function public.ticket_reject(
  p_ticket_id uuid, p_reason_id uuid, p_note text default null,
  p_client_request_id uuid default null)
returns void
language plpgsql
as $$
declare
  v_status public.ticket_status;
begin
  if public.request_already_handled(p_client_request_id) then return; end if;
  perform public.require_permission('ticket.reject');

  select status into v_status from public.tickets
  where id = p_ticket_id and status not in ('closed', 'rejected', 'cancelled', 'duplicate');
  if v_status is null then
    raise exception 'El tiquet no admite rechazo en su estado' using errcode = 'P0001';
  end if;

  update public.tickets
  set status = 'rejected', status_before_discard = v_status
  where id = p_ticket_id;
  perform public.write_event(
    p_ticket_id, 'rejected', jsonb_build_object('note', p_note),
    p_reason_id, null, null, p_client_request_id);
end;
$$;

-- Cancelación (RN-20).
create or replace function public.ticket_cancel(
  p_ticket_id uuid, p_reason_id uuid, p_note text default null,
  p_client_request_id uuid default null)
returns void
language plpgsql
as $$
declare
  v_status public.ticket_status;
begin
  if public.request_already_handled(p_client_request_id) then return; end if;
  perform public.require_permission('ticket.cancel');

  select status into v_status from public.tickets
  where id = p_ticket_id and status not in ('closed', 'rejected', 'cancelled', 'duplicate');
  if v_status is null then
    raise exception 'El tiquet no admite cancelación en su estado' using errcode = 'P0001';
  end if;

  update public.tickets
  set status = 'cancelled', status_before_discard = v_status
  where id = p_ticket_id;
  perform public.write_event(
    p_ticket_id, 'cancelled', jsonb_build_object('note', p_note),
    p_reason_id, null, null, p_client_request_id);
end;
$$;

-- Ajuste de prioridad (RN-28).
create or replace function public.ticket_change_priority(
  p_ticket_id uuid, p_priority_id uuid, p_client_request_id uuid default null)
returns void
language plpgsql
as $$
declare
  v_previous uuid;
begin
  if public.request_already_handled(p_client_request_id) then return; end if;
  perform public.require_permission('ticket.prioritize');

  select priority_id into v_previous from public.tickets where id = p_ticket_id;
  if v_previous is null then
    raise exception 'El tiquet no existe' using errcode = 'P0001';
  end if;

  update public.tickets set priority_id = p_priority_id where id = p_ticket_id;
  perform public.write_event(
    p_ticket_id, 'priority_changed',
    jsonb_build_object('from', v_previous, 'to', p_priority_id),
    null, null, null, p_client_request_id);
end;
$$;

-- Comentario (nota interna o visible).
create or replace function public.ticket_comment(
  p_ticket_id uuid, p_text text, p_is_internal boolean default true,
  p_client_request_id uuid default null)
returns void
language plpgsql
as $$
begin
  if public.request_already_handled(p_client_request_id) then return; end if;
  perform public.require_permission('ticket.view');
  perform public.write_event(
    p_ticket_id, 'comment',
    jsonb_build_object('text', p_text, 'is_internal', p_is_internal),
    null, null, null, p_client_request_id);
end;
$$;

-- Permisos de ejecución de las RPC.
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
    'ticket_change_priority(uuid, uuid, uuid)', 'ticket_comment(uuid, text, boolean, uuid)'
  ]
  loop
    execute format('revoke execute on function public.%s from public', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
