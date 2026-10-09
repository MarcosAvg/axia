-- Permisos de evidencia y avance, y nota en la evidencia.
--
-- - La evidencia libre (`other`) queda reservada a quien tenga `evidence.attach`.
-- - `evidence_add` acepta una nota (p. ej. el avance del paso `during`).
-- Requiere los permisos nuevos `evidence.attach` y `ticket.record_progress` (semilla).

-- Se reemplaza la firma anterior (sin nota) para evitar sobrecargas.
drop function if exists public.evidence_add(
  uuid, public.evidence_type, text, text, bigint, timestamptz, uuid);

create or replace function public.evidence_add(
  p_ticket_id uuid,
  p_type public.evidence_type,
  p_storage_path text,
  p_mime_type text default null,
  p_size_bytes bigint default null,
  p_occurred_at timestamptz default now(),
  p_client_request_id uuid default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cycle integer;
  v_status public.ticket_status;
  v_id uuid;
  v_event_id bigint;
  v_allowed boolean;
begin
  if p_client_request_id is not null then
    select id into v_id from public.evidence where client_request_id = p_client_request_id;
    if v_id is not null then
      return v_id;
    end if;
  end if;

  if p_storage_path is null or btrim(p_storage_path) = '' then
    raise exception 'La ruta del archivo es obligatoria' using errcode = '22023';
  end if;

  select cycle, status into v_cycle, v_status from public.tickets where id = p_ticket_id;
  if v_cycle is null then
    raise exception 'El tiquet no existe' using errcode = 'P0001';
  end if;
  if not public.can_see_ticket(p_ticket_id) then
    raise exception 'No puedes agregar evidencia a ese tiquet' using errcode = '42501';
  end if;

  -- La evidencia libre (cajón de sastre) exige el permiso específico.
  if p_type = 'other'
     and not public.has_permission(auth.uid(), 'evidence.attach') then
    raise exception 'No tienes permiso para agregar evidencia libre' using errcode = '42501';
  end if;

  v_allowed := case p_type
    when 'request' then v_status in ('registered')
    when 'before' then v_status in ('assigned')
    when 'during' then v_status in ('in_progress', 'paused')
    when 'after' then v_status in ('in_progress', 'paused')
    when 'claim' then v_status in ('attended', 'closed', 'under_claim')
    when 'other' then v_status not in ('closed', 'rejected', 'cancelled', 'duplicate')
    else false
  end;
  if not v_allowed then
    raise exception 'No se puede agregar evidencia de tipo % en el estado %', p_type, v_status
      using errcode = 'P0001';
  end if;

  insert into public.evidence (
    ticket_id, cycle, type, storage_path, mime_type, size_bytes,
    captured_by_user_id, uploaded_by, occurred_at, client_request_id)
  values (
    p_ticket_id, v_cycle, p_type, p_storage_path, p_mime_type, p_size_bytes,
    auth.uid(), auth.uid(), p_occurred_at, p_client_request_id)
  returning id into v_id;

  perform public.write_event(
    p_ticket_id, 'evidence_added',
    jsonb_build_object(
      'evidence_id', v_id, 'type', p_type, 'storage_path', p_storage_path,
      'note', nullif(btrim(coalesce(p_note, '')), '')),
    null, null, null, null);

  select id into v_event_id from public.ticket_events
    where ticket_id = p_ticket_id order by id desc limit 1;
  update public.evidence set event_id = v_event_id where id = v_id;

  return v_id;
end;
$$;
comment on function public.evidence_add is
  'Registra una evidencia validando el tipo según el estado, con nota opcional (avance).';
revoke execute on function public.evidence_add from public, anon;
grant execute on function public.evidence_add to authenticated;
