-- Reglas de evidencia por estado del tiquet.
--
-- La evidencia ya no puede subirse en cualquier momento: cada tipo tiene una ventana de estados.
-- Además, abrir una reclamación exige la evidencia `claim` del ciclo (RN-16). Refuerza lo que la
-- interfaz guía (docs/guia-tiquets.md y docs/decisions/0044).

-- 1. `evidence_add` valida el tipo contra el estado actual del tiquet.
create or replace function public.evidence_add(
  p_ticket_id uuid,
  p_type public.evidence_type,
  p_storage_path text,
  p_mime_type text default null,
  p_size_bytes bigint default null,
  p_occurred_at timestamptz default now(),
  p_client_request_id uuid default null
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

  -- Matriz tipo de evidencia ↔ estado del tiquet.
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
    jsonb_build_object('evidence_id', v_id, 'type', p_type, 'storage_path', p_storage_path),
    null, null, null, null);

  select id into v_event_id from public.ticket_events
    where ticket_id = p_ticket_id order by id desc limit 1;
  update public.evidence set event_id = v_event_id where id = v_id;

  return v_id;
end;
$$;
comment on function public.evidence_add is
  'Registra una evidencia (archivo ya subido a Storage) validando el tipo según el estado.';
revoke execute on function public.evidence_add from public, anon;
grant execute on function public.evidence_add to authenticated;

-- 2. Abrir una reclamación exige evidencia `claim` del ciclo (RN-16).
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

  if not exists (
    select 1 from public.evidence
    where ticket_id = p_ticket_id and cycle = v.cycle and type = 'claim'
  ) then
    raise exception 'Falta la evidencia de la reclamación' using errcode = 'P0001';
  end if;

  insert into public.ticket_claims (ticket_id, cycle, opened_by, reason_id, description, prior_status, client_request_id)
  values (p_ticket_id, v.cycle, auth.uid(), p_reason_id, p_description, v.status, p_client_request_id);

  update public.tickets set status = 'under_claim' where id = p_ticket_id;
  perform public.write_event(
    p_ticket_id, 'claim_opened', jsonb_build_object('description', p_description),
    p_reason_id, null, null, null);
end;
$$;
comment on function public.ticket_open_claim is
  'Abre una reclamación (RN-16); exige evidencia `claim` del ciclo.';
revoke execute on function public.ticket_open_claim from public, anon;
grant execute on function public.ticket_open_claim to authenticated;
