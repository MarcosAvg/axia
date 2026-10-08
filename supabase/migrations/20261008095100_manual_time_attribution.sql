-- Fase 4B, tramo 1: tiempos manuales con atribución al técnico y anulación.
-- RN §13: el supervisor/admin registra y corrige tramos; la corrección anula el anterior y
-- registra uno nuevo (el historial y los indicadores no cuentan doble).

alter table public.time_spans
  add column subject_technician_id uuid references public.technicians (id),
  add column voided_at timestamptz,
  add column voided_by uuid references auth.users (id);
comment on column public.time_spans.subject_technician_id is
  'Técnico al que pertenece el tramo manual (RN §13).';
comment on column public.time_spans.voided_at is
  'Marca de anulación de un tramo manual corregido; no cuenta en los indicadores.';

create index idx_time_spans_manual on public.time_spans (ticket_id, origin);

-- Registro manual de un tramo (con técnico sujeto opcional).
drop function if exists public.time_span_record(
  uuid, public.time_span_kind, timestamptz, timestamptz, public.clock_class, uuid);

create or replace function public.time_span_record(
  p_ticket_id uuid,
  p_kind public.time_span_kind,
  p_started_at timestamptz,
  p_ended_at timestamptz,
  p_clock_class public.clock_class default 'counted',
  p_client_request_id uuid default null,
  p_subject_technician_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_reported timestamptz;
begin
  if public.request_already_handled(p_client_request_id) then
    select id into v_id from public.time_spans where client_request_id = p_client_request_id;
    return v_id;
  end if;
  perform public.require_permission('time.record_manual');

  select reported_at into v_reported from public.tickets where id = p_ticket_id;
  if v_reported is null then
    raise exception 'El tiquet no existe' using errcode = 'P0001';
  end if;
  if p_ended_at <= p_started_at then
    raise exception 'El fin debe ser posterior al inicio' using errcode = 'P0001';
  end if;
  if p_started_at < v_reported or p_ended_at > now() + interval '1 minute' then
    raise exception 'El tramo debe estar dentro de la vida del tiquet' using errcode = 'P0001';
  end if;

  insert into public.time_spans (
    ticket_id, cycle, kind, started_at, ended_at, clock_class, origin, recorded_by,
    subject_technician_id, client_request_id)
  select id, cycle, p_kind, p_started_at, p_ended_at, p_clock_class, 'manual', auth.uid(),
         p_subject_technician_id, p_client_request_id
  from public.tickets where id = p_ticket_id
  returning id into v_id;

  perform public.write_event(
    p_ticket_id, 'manual_time_recorded',
    jsonb_build_object('kind', p_kind, 'subject_technician_id', p_subject_technician_id),
    null, null, p_subject_technician_id, null);
  return v_id;
end;
$$;
comment on function public.time_span_record(
  uuid, public.time_span_kind, timestamptz, timestamptz, public.clock_class, uuid, uuid) is
  'Registra un tramo manual y lo atribuye a un técnico; valida orden y vida del tiquet.';
revoke execute on function public.time_span_record(
  uuid, public.time_span_kind, timestamptz, timestamptz, public.clock_class, uuid, uuid) from public, anon;
grant execute on function public.time_span_record(
  uuid, public.time_span_kind, timestamptz, timestamptz, public.clock_class, uuid, uuid) to authenticated;

-- Anulación de un tramo manual (corrección).
create or replace function public.time_span_void(
  p_ticket_id uuid,
  p_span_id uuid,
  p_client_request_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated uuid;
begin
  if public.request_already_handled(p_client_request_id) then return; end if;
  perform public.require_permission('time.record_manual');

  update public.time_spans
    set voided_at = now(), voided_by = auth.uid()
    where id = p_span_id and ticket_id = p_ticket_id
      and origin = 'manual' and voided_at is null
    returning id into v_updated;
  if v_updated is null then
    raise exception 'Tramo manual no encontrado' using errcode = 'P0001';
  end if;

  perform public.write_event(
    p_ticket_id, 'manual_time_recorded',
    jsonb_build_object('voided_span', p_span_id),
    null, null, null, null);
end;
$$;
comment on function public.time_span_void(uuid, uuid, uuid) is
  'Anula un tramo manual (corrección); el historial se conserva y no cuenta doble.';
revoke execute on function public.time_span_void(uuid, uuid, uuid) from public, anon;
grant execute on function public.time_span_void(uuid, uuid, uuid) to authenticated;

-- Los tramos anulados no cuentan en los cálculos.
create or replace function public.ticket_time_net(p_ticket_id uuid)
returns interval
language sql
stable
as $$
  select public.ticket_time_total(p_ticket_id)
    - coalesce((
        select sum(coalesce(ended_at, now()) - started_at)
        from public.time_spans
        where ticket_id = p_ticket_id and clock_class = 'not_counted'
          and voided_at is null
      ), interval '0');
$$;
comment on function public.ticket_time_net(uuid) is
  'Tiempo neto (excluye no contables y anulados).';

create or replace function public.ticket_time_by_kind(p_ticket_id uuid, p_kind public.time_span_kind)
returns interval
language sql
stable
as $$
  select coalesce(sum(coalesce(ended_at, now()) - started_at), interval '0')
  from public.time_spans
  where ticket_id = p_ticket_id and kind = p_kind and voided_at is null;
$$;
comment on function public.ticket_time_by_kind(uuid, public.time_span_kind) is
  'Suma por tipo de tramo (excluye anulados).';
