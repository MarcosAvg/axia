-- Reanudar la pausa acepta cualquier descendiente del motivo (subestados anidados).
-- Sustituye la validación de "hijo directo" por "descendiente del motivo".

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
  if v_reason.id = v_pause.root_reason_id
     or not public.reason_is_descendant_or_self(v_reason.id, v_pause.root_reason_id) then
    raise exception 'El subestado debe pertenecer al motivo de la pausa' using errcode = 'P0001';
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
  'Reanuda el tiquet con el subestado (descendiente del motivo) que esclarece la pausa.';
revoke execute on function public.ticket_resume(uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.ticket_resume(uuid, uuid, uuid, uuid) to authenticated;
