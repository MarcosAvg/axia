-- Subestados de pausa (RN-13): validación de subestados y lectura de pasos.
-- Endurece ticket_pause/ticket_advance_pause y expone los pasos de la pausa al detalle.

-- Pausar: exige un motivo del uso `pause`, activo.
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
  if v_reason.id is null or v_reason.use <> 'pause' or not v_reason.active then
    raise exception 'El motivo de pausa no es válido' using errcode = 'P0001';
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
comment on function public.ticket_pause(uuid, uuid, text, date, uuid, uuid) is
  'Pausa el tiquet con un motivo del catálogo (uso pause).';
revoke execute on function public.ticket_pause(uuid, uuid, text, date, uuid, uuid) from public, anon;
grant execute on function public.ticket_pause(uuid, uuid, text, date, uuid, uuid) to authenticated;

-- Avanzar el subestado: exige un hijo directo y activo del subestado actual.
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
  if v_reason.parent_id is distinct from v_pause.reason_id then
    raise exception 'El subestado debe ser un hijo directo del subestado actual'
      using errcode = 'P0001';
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
comment on function public.ticket_advance_pause(uuid, uuid, text, uuid, uuid) is
  'Avanza el subestado de la pausa a un hijo directo del actual.';
revoke execute on function public.ticket_advance_pause(uuid, uuid, text, uuid, uuid) from public, anon;
grant execute on function public.ticket_advance_pause(uuid, uuid, text, uuid, uuid) to authenticated;

-- Pasos de la pausa de un tiquet (para el detalle); respeta la visibilidad.
create or replace function public.ticket_pause_steps(p_ticket_id uuid)
returns table (
  pause_id uuid,
  reason_id uuid,
  reason_name text,
  entered_at timestamptz,
  exited_at timestamptz,
  note text,
  actor_name text
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
    select s.pause_id, s.reason_id, r.name, s.entered_at, s.exited_at, s.note,
           p.full_name
    from public.ticket_pause_steps s
    join public.ticket_pauses pa on pa.id = s.pause_id
    join public.reasons r on r.id = s.reason_id
    left join public.profiles p on p.id = s.actor_id
    where pa.ticket_id = p_ticket_id
    order by s.entered_at;
end;
$$;
comment on function public.ticket_pause_steps(uuid) is
  'Pasos (subestados) de las pausas de un tiquet, con sus fechas.';
revoke execute on function public.ticket_pause_steps(uuid) from public, anon;
grant execute on function public.ticket_pause_steps(uuid) to authenticated;
