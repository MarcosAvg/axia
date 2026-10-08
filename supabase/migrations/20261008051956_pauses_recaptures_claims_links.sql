-- Tramo 5 de la Fase 1: pausas y subestados, recaptura, reclamaciones, reapertura,
-- duplicados y reactivación. Diseño: docs/modelo-datos.md §4 (matriz de transiciones).

create type public.claim_status as enum ('open', 'resolved');
create type public.claim_resolution as enum ('upheld', 'dismissed', 'new_ticket');
create type public.link_type as enum ('duplicate_of', 'derived_from', 'related_to', 'blocked_by');

create table public.ticket_pauses (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  cycle integer not null check (cycle > 0),
  reason_id uuid not null references public.reasons (id),
  opened_by uuid references auth.users (id),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  note text,
  estimated_date date,
  origin public.span_origin not null default 'system',
  recorded_by uuid references auth.users (id),
  client_request_id uuid unique,
  created_at timestamptz not null default now()
);
comment on table public.ticket_pauses is
  'Pausa de un tiquet (máximo una abierta). reason_id es el subestado actual.';

create unique index ticket_pauses_one_open
  on public.ticket_pauses (ticket_id) where closed_at is null;

create table public.ticket_pause_steps (
  id uuid primary key default gen_random_uuid(),
  pause_id uuid not null references public.ticket_pauses (id) on delete cascade,
  reason_id uuid not null references public.reasons (id),
  entered_at timestamptz not null default now(),
  exited_at timestamptz,
  actor_id uuid references auth.users (id),
  note text
);
comment on table public.ticket_pause_steps is
  'Cada paso del subestado de la pausa (para medir tiempo por subestado).';

create table public.ticket_claims (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  cycle integer not null check (cycle > 0),
  opened_by uuid references auth.users (id),
  opened_at timestamptz not null default now(),
  reason_id uuid not null references public.reasons (id),
  description text not null,
  status public.claim_status not null default 'open',
  prior_status public.ticket_status not null,
  resolution public.claim_resolution,
  result_id uuid references public.reasons (id),
  resolved_by uuid references auth.users (id),
  resolved_at timestamptz,
  resolution_note text,
  client_request_id uuid unique,
  created_at timestamptz not null default now()
);
comment on table public.ticket_claims is 'Reclamaciones (RN-16/RN-17).';

create table public.ticket_links (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  linked_ticket_id uuid not null references public.tickets (id),
  link_type public.link_type not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (ticket_id, linked_ticket_id, link_type)
);
comment on table public.ticket_links is
  'Enlaces entre tiquets. ticket_id es el que se enlaza; linked_ticket_id el referido.';

create index idx_ticket_claims_ticket on public.ticket_claims (ticket_id);
create index idx_ticket_links_ticket on public.ticket_links (ticket_id);

alter table public.ticket_pauses enable row level security;
alter table public.ticket_pause_steps enable row level security;
alter table public.ticket_claims enable row level security;
alter table public.ticket_links enable row level security;

-- Pausar (RN-13).
create or replace function public.ticket_pause(
  p_ticket_id uuid, p_reason_id uuid, p_note text default null,
  p_estimated_date date default null, p_client_request_id uuid default null)
returns void
language plpgsql
as $$
declare
  v public.tickets;
  v_pause_id uuid;
begin
  if public.request_already_handled(p_client_request_id) then return; end if;
  perform public.require_permission('ticket.pause');

  select * into v from public.tickets where id = p_ticket_id and status = 'in_progress';
  if v.id is null then
    raise exception 'El tiquet no está en proceso' using errcode = 'P0001';
  end if;

  insert into public.ticket_pauses (ticket_id, cycle, reason_id, opened_by, note, estimated_date, client_request_id)
  values (p_ticket_id, v.cycle, p_reason_id, auth.uid(), p_note, p_estimated_date, p_client_request_id)
  returning id into v_pause_id;

  insert into public.ticket_pause_steps (pause_id, reason_id, actor_id)
  values (v_pause_id, p_reason_id, auth.uid());

  update public.tickets set status = 'paused' where id = p_ticket_id;
  perform public.write_event(p_ticket_id, 'paused', '{}'::jsonb, p_reason_id, null, null, null);
end;
$$;

-- Avanzar el subestado de la pausa.
create or replace function public.ticket_advance_pause(
  p_ticket_id uuid, p_reason_id uuid, p_note text default null,
  p_client_request_id uuid default null)
returns void
language plpgsql
as $$
declare
  v_pause public.ticket_pauses;
begin
  if public.request_already_handled(p_client_request_id) then return; end if;
  perform public.require_permission('ticket.pause');

  select * into v_pause from public.ticket_pauses
  where ticket_id = p_ticket_id and closed_at is null
  order by opened_at desc limit 1;
  if v_pause.id is null then
    raise exception 'El tiquet no tiene una pausa abierta' using errcode = 'P0001';
  end if;

  update public.ticket_pause_steps set exited_at = now()
  where pause_id = v_pause.id and exited_at is null;

  insert into public.ticket_pause_steps (pause_id, reason_id, actor_id, note)
  values (v_pause.id, p_reason_id, auth.uid(), p_note);

  update public.ticket_pauses set reason_id = p_reason_id where id = v_pause.id;
  perform public.write_event(
    p_ticket_id, 'pause_advanced',
    jsonb_build_object('reason_id', p_reason_id), p_reason_id, null, null, null);
end;
$$;

-- Reanudar (cierra la pausa).
create or replace function public.ticket_resume(
  p_ticket_id uuid, p_client_request_id uuid default null)
returns void
language plpgsql
as $$
declare
  v_pause public.ticket_pauses;
begin
  if public.request_already_handled(p_client_request_id) then return; end if;
  perform public.require_permission('ticket.resume');

  select * into v_pause from public.ticket_pauses
  where ticket_id = p_ticket_id and closed_at is null
  order by opened_at desc limit 1;
  if v_pause.id is null then
    raise exception 'El tiquet no tiene una pausa abierta' using errcode = 'P0001';
  end if;

  update public.ticket_pause_steps set exited_at = now()
  where pause_id = v_pause.id and exited_at is null;
  update public.ticket_pauses set closed_at = now() where id = v_pause.id;
  update public.tickets set status = 'in_progress' where id = p_ticket_id;
  perform public.write_event(p_ticket_id, 'resumed', '{}'::jsonb, null, null, null, null);
end;
$$;

-- Recaptura (RN-11): aplica cambios sobre el mismo tiquet y conserva cada versión.
create or replace function public.ticket_recapture(
  p_ticket_id uuid, p_changes jsonb, p_reason_id uuid default null,
  p_client_request_id uuid default null)
returns void
language plpgsql
as $$
declare
  v public.tickets;
  v_technician uuid;
  v_designated boolean;
  v_old_team uuid;
  v_new_team uuid;
begin
  if public.request_already_handled(p_client_request_id) then return; end if;
  perform public.require_permission('ticket.recapture');

  select * into v from public.tickets
  where id = p_ticket_id and status not in ('closed', 'rejected', 'cancelled', 'duplicate');
  if v.id is null then
    raise exception 'El tiquet no admite recaptura en su estado' using errcode = 'P0001';
  end if;

  insert into public.ticket_captures (ticket_id, cycle, changed_by, reason_id, changes)
  values (p_ticket_id, v.cycle, auth.uid(), p_reason_id, p_changes);

  update public.tickets set
    building_id = coalesce((p_changes ->> 'building_id')::uuid, building_id),
    location_id = coalesce((p_changes ->> 'location_id')::uuid, location_id),
    dependency_id = coalesce((p_changes ->> 'dependency_id')::uuid, dependency_id),
    category_id = coalesce((p_changes ->> 'category_id')::uuid, category_id),
    subcategory_id = coalesce((p_changes ->> 'subcategory_id')::uuid, subcategory_id),
    problem_id = coalesce((p_changes ->> 'problem_id')::uuid, problem_id),
    service_type_id = coalesce((p_changes ->> 'service_type_id')::uuid, service_type_id),
    priority_id = coalesce((p_changes ->> 'priority_id')::uuid, priority_id),
    description = coalesce(p_changes ->> 'description', description)
  where id = p_ticket_id;

  if p_changes ? 'category_id' then
    v_old_team := v.team_id;
    select team_id into v_new_team from public.categories
      where id = (p_changes ->> 'category_id')::uuid;
    update public.tickets set team_id = v_new_team where id = p_ticket_id;

    -- Si el técnico asignado ya no corresponde al área, vuelve al supervisor.
    select technician_id into v_technician from public.ticket_assignments
    where ticket_id = p_ticket_id and stage = 'technician' and ended_at is null
    order by assigned_at desc limit 1;

    if v_technician is not null then
      select exists (
        select 1 from public.technician_categories
        where technician_id = v_technician and category_id = (p_changes ->> 'category_id')::uuid
      ) into v_designated;
      if not v_designated and v_new_team is distinct from v_old_team then
        update public.tickets set status = 'with_supervisor' where id = p_ticket_id;
      end if;
    end if;
  end if;

  perform public.write_event(
    p_ticket_id, 'capture_recaptured', p_changes, p_reason_id, null, null, null);
end;
$$;

-- Abrir reclamación (RN-16).
create or replace function public.ticket_open_claim(
  p_ticket_id uuid, p_reason_id uuid, p_description text,
  p_client_request_id uuid default null)
returns void
language plpgsql
as $$
declare
  v public.tickets;
  v_window interval;
  v_allowed boolean := false;
begin
  if public.request_already_handled(p_client_request_id) then return; end if;
  perform public.require_permission('ticket.open_claim');

  select * into v from public.tickets where id = p_ticket_id;
  select claim_window into v_window from public.instance_settings limit 1;

  if v.status = 'attended' then
    v_allowed := true;
  elsif v.status = 'closed' and v.closed_at is not null and now() - v.closed_at <= v_window then
    v_allowed := true;
  end if;
  if not v_allowed then
    raise exception 'No se puede reclamar un tiquet en el estado %', v.status using errcode = 'P0001';
  end if;

  insert into public.ticket_claims (ticket_id, cycle, opened_by, reason_id, description, prior_status, client_request_id)
  values (p_ticket_id, v.cycle, auth.uid(), p_reason_id, p_description, v.status, p_client_request_id);

  update public.tickets set status = 'under_claim' where id = p_ticket_id;
  perform public.write_event(
    p_ticket_id, 'claim_opened', jsonb_build_object('description', p_description),
    p_reason_id, null, null, null);
end;
$$;

-- Resolver reclamación (RN-17). Devuelve el id del tiquet derivado si el resultado lo pide.
create or replace function public.ticket_resolve_claim(
  p_ticket_id uuid, p_resolution public.claim_resolution,
  p_result_id uuid default null, p_note text default null,
  p_client_request_id uuid default null)
returns uuid
language plpgsql
as $$
declare
  v_claim public.ticket_claims;
  v_ticket public.tickets;
  v_new_id uuid;
begin
  if public.request_already_handled(p_client_request_id) then
    return null;
  end if;
  perform public.require_permission('ticket.resolve_claim');

  select * into v_claim from public.ticket_claims
  where ticket_id = p_ticket_id and status = 'open'
  order by opened_at desc limit 1;
  if v_claim.id is null then
    raise exception 'El tiquet no tiene una reclamación abierta' using errcode = 'P0001';
  end if;
  select * into v_ticket from public.tickets where id = p_ticket_id;

  update public.ticket_claims set
    status = 'resolved', resolution = p_resolution, result_id = p_result_id,
    resolved_by = auth.uid(), resolved_at = now(), resolution_note = p_note
  where id = v_claim.id;

  if p_resolution = 'upheld' then
    update public.tickets
    set status = 'assigned', cycle = v_ticket.cycle + 1
    where id = p_ticket_id;
    perform public.write_event(p_ticket_id, 'reopened', '{}'::jsonb, null, null, null, null);
  elsif p_resolution = 'dismissed' then
    update public.tickets set status = 'closed', closed_at = now() where id = p_ticket_id;
    perform public.write_event(p_ticket_id, 'claim_resolved', '{}'::jsonb, null, null, null, null);
  else
    -- Requiere tiquet nuevo: vuelve al estado previo y crea uno derivado enlazado.
    update public.tickets set status = v_claim.prior_status where id = p_ticket_id;

    insert into public.tickets (
      building_id, location_id, dependency_id, category_id, subcategory_id, problem_id,
      service_type_id, priority_id, channel_id, description, requester_id, requester_name,
      requester_contact, registered_by)
    values (
      v_ticket.building_id, v_ticket.location_id, v_ticket.dependency_id, v_ticket.category_id,
      v_ticket.subcategory_id, v_ticket.problem_id, v_ticket.service_type_id, v_ticket.priority_id,
      v_ticket.channel_id, v_ticket.description, v_ticket.requester_id, v_ticket.requester_name,
      v_ticket.requester_contact, auth.uid())
    returning id into v_new_id;

    insert into public.ticket_links (ticket_id, linked_ticket_id, link_type, created_by)
    values (v_new_id, p_ticket_id, 'derived_from', auth.uid());

    perform public.write_event(v_new_id, 'created', jsonb_build_object('derived_from', p_ticket_id));
    perform public.ticket_route(v_new_id);
    perform public.write_event(p_ticket_id, 'claim_resolved', '{}'::jsonb, null, null, null, null);
  end if;

  return v_new_id;
end;
$$;

-- Marcar duplicado (RN-29). Cualquier participante con permiso.
create or replace function public.ticket_mark_duplicate(
  p_ticket_id uuid, p_original_id uuid, p_client_request_id uuid default null)
returns void
language plpgsql
as $$
declare
  v public.tickets;
begin
  if public.request_already_handled(p_client_request_id) then return; end if;
  perform public.require_permission('ticket.mark_duplicate');

  if p_ticket_id = p_original_id then
    raise exception 'Un tiquet no puede ser duplicado de sí mismo' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.tickets where id = p_original_id) then
    raise exception 'El tiquet original no existe' using errcode = 'P0001';
  end if;

  select * into v from public.tickets where id = p_ticket_id
    and status not in ('closed', 'rejected', 'cancelled', 'duplicate');
  if v.id is null then
    raise exception 'El tiquet no admite marcarse como duplicado' using errcode = 'P0001';
  end if;

  insert into public.ticket_links (ticket_id, linked_ticket_id, link_type, created_by)
  values (p_ticket_id, p_original_id, 'duplicate_of', auth.uid());

  update public.tickets
  set status = 'duplicate', status_before_discard = v.status, duplicate_of_id = p_original_id
  where id = p_ticket_id;

  perform public.write_event(
    p_ticket_id, 'duplicate_marked', jsonb_build_object('duplicate_of', p_original_id),
    null, null, null, null);
end;
$$;

-- Reactivar (RN-30): vuelve al estado previo al descarte.
create or replace function public.ticket_reactivate(
  p_ticket_id uuid, p_reason_id uuid, p_client_request_id uuid default null)
returns void
language plpgsql
as $$
declare
  v public.tickets;
begin
  if public.request_already_handled(p_client_request_id) then return; end if;
  perform public.require_permission('ticket.reactivate');

  select * into v from public.tickets
  where id = p_ticket_id and status in ('rejected', 'cancelled', 'duplicate');
  if v.id is null then
    raise exception 'El tiquet no está descartado' using errcode = 'P0001';
  end if;
  if v.status_before_discard is null then
    raise exception 'No hay estado previo al descarte' using errcode = 'P0001';
  end if;

  update public.tickets
  set status = v.status_before_discard, status_before_discard = null
  where id = p_ticket_id;
  perform public.write_event(
    p_ticket_id, 'reactivated', jsonb_build_object('to', v.status_before_discard),
    p_reason_id, null, null, null);
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'ticket_pause(uuid, uuid, text, date, uuid)',
    'ticket_advance_pause(uuid, uuid, text, uuid)',
    'ticket_resume(uuid, uuid)',
    'ticket_recapture(uuid, jsonb, uuid, uuid)',
    'ticket_open_claim(uuid, uuid, text, uuid)',
    'ticket_resolve_claim(uuid, claim_resolution, uuid, text, uuid)',
    'ticket_mark_duplicate(uuid, uuid, uuid)',
    'ticket_reactivate(uuid, uuid, uuid)'
  ]
  loop
    execute format('revoke execute on function public.%s from public', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
