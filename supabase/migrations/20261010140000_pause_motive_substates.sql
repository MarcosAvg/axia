-- Pausa por motivo (padre) y subestados:
--  * el motivo es un nodo raíz del catálogo de pausa;
--  * al reanudar es obligatorio un subestado (hijo directo del motivo);
--  * gestionar la pausa permite elegir cualquier descendiente del motivo;
--  * el tiempo de pausa se mide por subestado (tramo por cambio y al reanudar).

-- 1. Motivo de la pausa (nodo raíz con el que se abrió).
alter table public.ticket_pauses
  add column root_reason_id uuid references public.reasons (id);
update public.ticket_pauses set root_reason_id = reason_id where root_reason_id is null;
alter table public.ticket_pauses alter column root_reason_id set not null;
comment on column public.ticket_pauses.root_reason_id is
  'Motivo (nodo raíz del catálogo de pausa) con el que se abrió la pausa.';

-- 2. ¿El nodo es el ancestro dado o un descendiente suyo?
create or replace function public.reason_is_descendant_or_self(
  p_reason_id uuid,
  p_ancestor_id uuid
)
returns boolean
language sql
stable
as $$
  with recursive tree as (
    select id, parent_id from public.reasons where id = p_reason_id
    union all
    select r.id, r.parent_id
    from public.reasons r join tree t on r.id = t.parent_id
  )
  select exists (select 1 from tree where id = p_ancestor_id);
$$;
comment on function public.reason_is_descendant_or_self(uuid, uuid) is
  'Verdadero si el nodo es el ancestro o un descendiente suyo.';
revoke execute on function public.reason_is_descendant_or_self(uuid, uuid) from public, anon;
grant execute on function public.reason_is_descendant_or_self(uuid, uuid) to authenticated;

-- 3. Pausar: el motivo debe ser raíz del uso `pause`, activo.
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
security definer
set search_path to public, extensions, pg_temp
as $$
declare
  v public.tickets;
  v_reason public.reasons;
  v_pause_id uuid;
begin
  if public.request_already_handled(p_client_request_id) then return; end if;
  perform public.require_technician_action(p_ticket_id, 'ticket.pause', p_subject_technician_id);

  select * into v from public.tickets where id = p_ticket_id and status = 'in_progress';
  if v.id is null then
    raise exception 'El tiquet no está en proceso' using errcode = 'P0001';
  end if;

  select * into v_reason from public.reasons where id = p_reason_id;
  if v_reason.id is null
     or v_reason.use <> 'pause'
     or not v_reason.active
     or v_reason.parent_id is not null then
    raise exception 'El motivo de pausa no es válido (debe ser un motivo raíz)' using errcode = 'P0001';
  end if;

  insert into public.ticket_pauses (
    ticket_id, cycle, reason_id, root_reason_id, opened_by, note, estimated_date, client_request_id)
  values (
    p_ticket_id, v.cycle, p_reason_id, p_reason_id, auth.uid(), p_note, p_estimated_date, p_client_request_id)
  returning id into v_pause_id;

  insert into public.ticket_pause_steps (pause_id, reason_id, actor_id)
  values (v_pause_id, p_reason_id, auth.uid());

  update public.tickets set status = 'paused' where id = p_ticket_id;
  perform public.write_event(
    p_ticket_id, 'paused', '{}'::jsonb, p_reason_id, null, p_subject_technician_id, null);
end;
$$;
revoke execute on function public.ticket_pause(uuid, uuid, text, date, uuid, uuid) from public, anon;
grant execute on function public.ticket_pause(uuid, uuid, text, date, uuid, uuid) to authenticated;

-- 4. Gestionar la pausa: subestado libre dentro del motivo (cualquier descendiente).
create or replace function public.ticket_advance_pause(
  p_ticket_id uuid,
  p_reason_id uuid,
  p_note text default null,
  p_client_request_id uuid default null,
  p_subject_technician_id uuid default null
)
returns void
language plpgsql
security definer
set search_path to public, extensions, pg_temp
as $$
declare
  v_pause public.ticket_pauses;
  v_reason public.reasons;
begin
  if public.request_already_handled(p_client_request_id) then return; end if;
  perform public.require_technician_action(p_ticket_id, 'ticket.pause', p_subject_technician_id);

  select * into v_pause from public.ticket_pauses
  where ticket_id = p_ticket_id and closed_at is null
  order by opened_at desc limit 1;
  if v_pause.id is null then
    raise exception 'El tiquet no tiene una pausa abierta' using errcode = 'P0001';
  end if;

  select * into v_reason from public.reasons where id = p_reason_id;
  if v_reason.id is null or not v_reason.active then
    raise exception 'El subestado no existe o está inactivo' using errcode = 'P0001';
  end if;
  if v_reason.id = v_pause.root_reason_id
     or not public.reason_is_descendant_or_self(v_reason.id, v_pause.root_reason_id) then
    raise exception 'El subestado debe pertenecer al motivo de la pausa' using errcode = 'P0001';
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
revoke execute on function public.ticket_advance_pause(uuid, uuid, text, uuid, uuid) from public, anon;
grant execute on function public.ticket_advance_pause(uuid, uuid, text, uuid, uuid) to authenticated;

-- 5. Reanudar: exige un subestado, hijo directo del motivo.
drop function if exists public.ticket_resume(uuid, uuid, uuid);
create or replace function public.ticket_resume(
  p_ticket_id uuid,
  p_reason_id uuid,
  p_client_request_id uuid default null,
  p_subject_technician_id uuid default null
)
returns void
language plpgsql
security definer
set search_path to public, extensions, pg_temp
as $$
declare
  v_pause public.ticket_pauses;
  v_reason public.reasons;
begin
  if public.request_already_handled(p_client_request_id) then return; end if;
  perform public.require_technician_action(p_ticket_id, 'ticket.resume', p_subject_technician_id);

  select * into v_pause from public.ticket_pauses
  where ticket_id = p_ticket_id and closed_at is null
  order by opened_at desc limit 1;
  if v_pause.id is null then
    raise exception 'El tiquet no tiene una pausa abierta' using errcode = 'P0001';
  end if;

  select * into v_reason from public.reasons where id = p_reason_id;
  if v_reason.id is null or not v_reason.active then
    raise exception 'El subestado no existe o está inactivo' using errcode = 'P0001';
  end if;
  if v_reason.parent_id is distinct from v_pause.root_reason_id then
    raise exception 'El subestado debe ser un hijo directo del motivo de la pausa'
      using errcode = 'P0001';
  end if;

  update public.ticket_pause_steps set exited_at = now()
  where pause_id = v_pause.id and exited_at is null;

  insert into public.ticket_pause_steps (pause_id, reason_id, actor_id, exited_at)
  values (v_pause.id, p_reason_id, auth.uid(), now());

  update public.ticket_pauses
  set reason_id = p_reason_id, closed_at = now()
  where id = v_pause.id;

  update public.tickets set status = 'in_progress' where id = p_ticket_id;
  perform public.write_event(
    p_ticket_id, 'resumed', '{}'::jsonb, p_reason_id, null, p_subject_technician_id, null);
end;
$$;
comment on function public.ticket_resume(uuid, uuid, uuid, uuid) is
  'Reanuda el tiquet con el subestado (hijo directo del motivo) que esclarece la pausa.';
revoke execute on function public.ticket_resume(uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.ticket_resume(uuid, uuid, uuid, uuid) to authenticated;

-- 6. Estado de la pausa abierta (motivo y subestado actual) para los formularios.
create or replace function public.ticket_pause_state(p_ticket_id uuid)
returns table (
  pause_id uuid,
  motive_id uuid,
  motive_name text,
  current_id uuid,
  current_name text,
  opened_at timestamptz
)
language plpgsql
security definer
set search_path to public, extensions, pg_temp
as $$
begin
  perform public.require_permission('ticket.view');
  if not public.can_see_ticket(p_ticket_id) then
    raise exception 'No tienes acceso a este tiquet' using errcode = '42501';
  end if;
  return query
    select p.id, p.root_reason_id, rm.name, p.reason_id, rc.name, p.opened_at
    from public.ticket_pauses p
    join public.reasons rm on rm.id = p.root_reason_id
    join public.reasons rc on rc.id = p.reason_id
    where p.ticket_id = p_ticket_id and p.closed_at is null
    order by p.opened_at desc
    limit 1;
end;
$$;
comment on function public.ticket_pause_state(uuid) is
  'Pausa abierta del tiquet con su motivo y su subestado actual.';
revoke execute on function public.ticket_pause_state(uuid) from public, anon;
grant execute on function public.ticket_pause_state(uuid) to authenticated;

-- 7. Tramos por subestado: gestionar abre tramo; reanudar lo etiqueta y cierra.
create or replace function public.ticket_events_record_spans()
returns trigger
language plpgsql
as $$
declare
  v_reported timestamptz;
  v_prev timestamptz;
  v_clock public.clock_class;
begin
  select reported_at into v_reported from public.tickets where id = new.ticket_id;

  if new.type = 'taken' then
    insert into public.time_spans (ticket_id, cycle, kind, started_at, ended_at)
    values (new.ticket_id, new.cycle, 'supervisor_response', v_reported, new.occurred_at);

  elsif new.type = 'reassigned_supervisor' then
    select max(occurred_at) into v_prev from public.ticket_events
      where ticket_id = new.ticket_id
        and type in ('taken', 'reassigned_supervisor') and occurred_at < new.occurred_at;
    insert into public.time_spans (ticket_id, cycle, kind, ref_id, started_at, ended_at)
    values (new.ticket_id, new.cycle, 'reassignment', new.reason_id,
            coalesce(v_prev, v_reported), new.occurred_at);

  elsif new.type = 'assigned_technician' then
    select max(occurred_at) into v_prev from public.ticket_events
      where ticket_id = new.ticket_id and type = 'taken';
    insert into public.time_spans (ticket_id, cycle, kind, started_at, ended_at)
    values (new.ticket_id, new.cycle, 'technician_assignment',
            coalesce(v_prev, v_reported), new.occurred_at);

  elsif new.type = 'started' then
    select max(occurred_at) into v_prev from public.ticket_events
      where ticket_id = new.ticket_id and type = 'assigned_technician';
    insert into public.time_spans (ticket_id, cycle, kind, started_at, ended_at)
    values (new.ticket_id, new.cycle, 'wait_start', coalesce(v_prev, v_reported), new.occurred_at);
    insert into public.time_spans (ticket_id, cycle, kind, started_at)
    values (new.ticket_id, new.cycle, 'active_work', new.occurred_at);

  elsif new.type = 'paused' then
    update public.time_spans set ended_at = new.occurred_at
      where ticket_id = new.ticket_id and kind = 'active_work' and ended_at is null;
    select clock_class into v_clock from public.reasons where id = new.reason_id;
    insert into public.time_spans (ticket_id, cycle, kind, ref_id, started_at, clock_class)
    values (new.ticket_id, new.cycle, 'pause', new.reason_id, new.occurred_at,
            coalesce(v_clock, 'counted'));

  elsif new.type = 'pause_advanced' then
    update public.time_spans set ended_at = new.occurred_at
      where ticket_id = new.ticket_id and kind = 'pause' and ended_at is null;
    select clock_class into v_clock from public.reasons where id = new.reason_id;
    insert into public.time_spans (ticket_id, cycle, kind, ref_id, started_at, clock_class)
    values (new.ticket_id, new.cycle, 'pause', new.reason_id, new.occurred_at,
            coalesce(v_clock, 'counted'));

  elsif new.type = 'resumed' then
    if new.reason_id is not null then
      select clock_class into v_clock from public.reasons where id = new.reason_id;
      update public.time_spans
      set ref_id = new.reason_id, clock_class = coalesce(v_clock, 'counted')
      where ticket_id = new.ticket_id and kind = 'pause' and ended_at is null;
    end if;
    update public.time_spans set ended_at = new.occurred_at
      where ticket_id = new.ticket_id and kind = 'pause' and ended_at is null;
    insert into public.time_spans (ticket_id, cycle, kind, started_at)
    values (new.ticket_id, new.cycle, 'active_work', new.occurred_at);

  elsif new.type = 'attended' then
    update public.time_spans set ended_at = new.occurred_at
      where ticket_id = new.ticket_id and kind = 'active_work' and ended_at is null;
    insert into public.time_spans (ticket_id, cycle, kind, started_at)
    values (new.ticket_id, new.cycle, 'validation', new.occurred_at);

  elsif new.type = 'validated' then
    if (select status from public.tickets where id = new.ticket_id) = 'closed' then
      update public.time_spans set ended_at = new.occurred_at
        where ticket_id = new.ticket_id and kind = 'validation' and ended_at is null;
    end if;

  elsif new.type = 'claim_opened' then
    update public.time_spans set ended_at = new.occurred_at
      where ticket_id = new.ticket_id and kind = 'validation' and ended_at is null;
    insert into public.time_spans (ticket_id, cycle, kind, started_at)
    values (new.ticket_id, new.cycle, 'claim', new.occurred_at);

  elsif new.type in ('claim_resolved', 'reopened') then
    update public.time_spans set ended_at = new.occurred_at
      where ticket_id = new.ticket_id and kind = 'claim' and ended_at is null;

  elsif new.type = 'duplicate_marked' then
    insert into public.time_spans (ticket_id, cycle, kind, started_at, ended_at)
    values (new.ticket_id, new.cycle, 'duplicate_review', v_reported, new.occurred_at);
  end if;

  return new;
end;
$$;
