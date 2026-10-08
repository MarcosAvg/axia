-- Fase 4B, tramo 3: proxy del técnico ("actuar en nombre de").
-- El administrador actúa en nombre de cualquier técnico; el supervisor, de los técnicos de sus
-- equipos. El historial distingue siempre actor (auth.uid) de sujeto (subject_technician_id).
-- Aplica a las acciones del técnico: iniciar, atender, pausar, avanzar subestado, reanudar y
-- recapturar.

create or replace function public.can_act_on_behalf(p_technician_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.user_roles ur
      join public.role_permissions rp on rp.role_id = ur.role_id
      join public.roles r on r.id = ur.role_id and r.active
      where ur.user_id = auth.uid()
        and rp.permission_id = 'act_on_behalf' and rp.scope = 'all'
    )
    or exists (
      select 1
      from public.user_roles ur
      join public.role_permissions rp on rp.role_id = ur.role_id
      join public.roles r on r.id = ur.role_id and r.active
      join public.technicians t on t.id = p_technician_id
      join public.supervisor_scopes ss
        on ss.user_id = auth.uid() and ss.team_id = t.team_id and ss.active
      where ur.user_id = auth.uid()
        and rp.permission_id = 'act_on_behalf' and rp.scope = 'team'
    );
$$;
comment on function public.can_act_on_behalf(uuid) is
  'Permiso para actuar en nombre del técnico (admin cualquiera; supervisor de sus equipos).';
revoke execute on function public.can_act_on_behalf(uuid) from public, anon;
grant execute on function public.can_act_on_behalf(uuid) to authenticated;

-- Permiso directo o proxy para una acción de técnico, más la participación en el tiquet.
create or replace function public.require_technician_action(
  p_ticket_id uuid,
  p_action_permission text,
  p_technician_id uuid,
  p_require_participant boolean default true
)
returns void
language plpgsql
stable
as $$
begin
  if p_technician_id is null then
    perform public.require_permission(p_action_permission);
    return;
  end if;
  if not public.can_act_on_behalf(p_technician_id) then
    raise exception 'Permiso insuficiente: act_on_behalf' using errcode = '42501';
  end if;
  if p_require_participant and not exists (
    select 1 from public.ticket_participants
    where ticket_id = p_ticket_id
      and technician_id = p_technician_id
      and ended_at is null
  ) then
    raise exception 'El técnico no participa en el tiquet' using errcode = 'P0001';
  end if;
end;
$$;
comment on function public.require_technician_action(uuid, text, uuid, boolean) is
  'Valida permiso directo o proxy (act_on_behalf) y la participación del técnico sujeto.';
revoke execute on function public.require_technician_action(uuid, text, uuid, boolean) from public, anon;
grant execute on function public.require_technician_action(uuid, text, uuid, boolean) to authenticated;

-- Iniciar (RN-12).
drop function if exists public.ticket_start(uuid, uuid);
create or replace function public.ticket_start(
  p_ticket_id uuid,
  p_client_request_id uuid default null,
  p_subject_technician_id uuid default null
)
returns void
language plpgsql
as $$
declare
  v_cycle integer;
begin
  if public.request_already_handled(p_client_request_id) then return; end if;
  perform public.require_technician_action(p_ticket_id, 'ticket.start', p_subject_technician_id);

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
  perform public.write_event(
    p_ticket_id, 'started', '{}'::jsonb, null, null, p_subject_technician_id, p_client_request_id);
end;
$$;

-- Atendido (RN-14).
drop function if exists public.ticket_attend(uuid, text, uuid);
create or replace function public.ticket_attend(
  p_ticket_id uuid,
  p_work_description text,
  p_client_request_id uuid default null,
  p_subject_technician_id uuid default null
)
returns void
language plpgsql
as $$
declare
  v_cycle integer;
begin
  if public.request_already_handled(p_client_request_id) then return; end if;
  perform public.require_technician_action(p_ticket_id, 'ticket.attend', p_subject_technician_id);

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
    null, null, p_subject_technician_id, p_client_request_id);
end;
$$;

-- Pausar (RN-13).
drop function if exists public.ticket_pause(uuid, uuid, text, date, uuid);
create or replace function public.ticket_pause(
  p_ticket_id uuid,
  p_reason_id uuid,
  p_note text default null,
  p_estimated_date date default null,
  p_client_request_id uuid default null,
  p_subject_technician_id uuid default null
)
returns void
language plpgsql
as $$
declare
  v public.tickets;
  v_pause_id uuid;
begin
  if public.request_already_handled(p_client_request_id) then return; end if;
  perform public.require_technician_action(p_ticket_id, 'ticket.pause', p_subject_technician_id);

  select * into v from public.tickets where id = p_ticket_id and status = 'in_progress';
  if v.id is null then
    raise exception 'El tiquet no está en proceso' using errcode = 'P0001';
  end if;

  insert into public.ticket_pauses (
    ticket_id, cycle, reason_id, opened_by, note, estimated_date, client_request_id)
  values (
    p_ticket_id, v.cycle, p_reason_id, auth.uid(), p_note, p_estimated_date, p_client_request_id)
  returning id into v_pause_id;

  insert into public.ticket_pause_steps (pause_id, reason_id, actor_id)
  values (v_pause_id, p_reason_id, auth.uid());

  update public.tickets set status = 'paused' where id = p_ticket_id;
  perform public.write_event(
    p_ticket_id, 'paused', '{}'::jsonb, p_reason_id, null, p_subject_technician_id, null);
end;
$$;

-- Avanzar el subestado de la pausa.
drop function if exists public.ticket_advance_pause(uuid, uuid, text, uuid);
create or replace function public.ticket_advance_pause(
  p_ticket_id uuid,
  p_reason_id uuid,
  p_note text default null,
  p_client_request_id uuid default null,
  p_subject_technician_id uuid default null
)
returns void
language plpgsql
as $$
declare
  v_pause public.ticket_pauses;
begin
  if public.request_already_handled(p_client_request_id) then return; end if;
  perform public.require_technician_action(p_ticket_id, 'ticket.pause', p_subject_technician_id);

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
    jsonb_build_object('reason_id', p_reason_id), p_reason_id, null,
    p_subject_technician_id, null);
end;
$$;

-- Reanudar (cierra la pausa).
drop function if exists public.ticket_resume(uuid, uuid);
create or replace function public.ticket_resume(
  p_ticket_id uuid,
  p_client_request_id uuid default null,
  p_subject_technician_id uuid default null
)
returns void
language plpgsql
as $$
declare
  v_pause public.ticket_pauses;
begin
  if public.request_already_handled(p_client_request_id) then return; end if;
  perform public.require_technician_action(p_ticket_id, 'ticket.resume', p_subject_technician_id);

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
  perform public.write_event(
    p_ticket_id, 'resumed', '{}'::jsonb, null, null, p_subject_technician_id, null);
end;
$$;

-- Recaptura (RN-11): puede ocurrir antes de asignar, sin participación todavía.
drop function if exists public.ticket_recapture(uuid, jsonb, uuid, uuid);
create or replace function public.ticket_recapture(
  p_ticket_id uuid,
  p_changes jsonb,
  p_reason_id uuid default null,
  p_client_request_id uuid default null,
  p_subject_technician_id uuid default null
)
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
  perform public.require_technician_action(
    p_ticket_id, 'ticket.recapture', p_subject_technician_id, false);

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
    p_ticket_id, 'capture_recaptured', p_changes, p_reason_id, null,
    p_subject_technician_id, null);
end;
$$;

-- Permisos de ejecución de las RPC con la nueva firma.
do $$
declare
  f text;
begin
  foreach f in array array[
    'ticket_start(uuid, uuid, uuid)',
    'ticket_attend(uuid, text, uuid, uuid)',
    'ticket_pause(uuid, uuid, text, date, uuid, uuid)',
    'ticket_advance_pause(uuid, uuid, text, uuid, uuid)',
    'ticket_resume(uuid, uuid, uuid)',
    'ticket_recapture(uuid, jsonb, uuid, uuid, uuid)'
  ]
  loop
    execute format('alter function public.%s security definer', f);
    execute format('alter function public.%s set search_path to public, extensions, pg_temp', f);
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
