-- Tramo 6 de la Fase 1: tramos de tiempo y funciones de cálculo.
-- Diseño: docs/modelo-datos.md §7. Los tramos se derivan de la bitácora (disparador), de modo
-- que cada transición crea o cierra su tramo; el cálculo laboral se completa en el tramo 8.

create type public.time_span_kind as enum (
  'supervisor_response', 'reassignment', 'technician_assignment', 'recapture',
  'wait_start', 'active_work', 'pause', 'validation', 'claim', 'duplicate_review'
);

create table public.time_spans (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  cycle integer not null check (cycle > 0),
  kind public.time_span_kind not null,
  ref_id uuid,
  started_at timestamptz not null,
  ended_at timestamptz,
  clock_class public.clock_class not null default 'counted',
  origin public.span_origin not null default 'system',
  recorded_by uuid references auth.users (id),
  client_request_id uuid unique,
  created_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);
comment on table public.time_spans is
  'Tramos de tiempo con inicio y fin. La clasificación de reloj se copia al crearse (RN §7).';

create index idx_time_spans_ticket on public.time_spans (ticket_id, cycle);
create index idx_time_spans_kind on public.time_spans (ticket_id, kind);

alter table public.time_spans enable row level security;

-- Registra/cierra tramos a partir de la bitácora.
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

  elsif new.type = 'resumed' then
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

create trigger ticket_events_record_spans
  after insert on public.ticket_events
  for each row execute function public.ticket_events_record_spans();

-- Tiempo total (continuo) del tiquet.
create or replace function public.ticket_time_total(p_ticket_id uuid)
returns interval
language sql
stable
as $$
  select coalesce(t.closed_at, now()) - t.reported_at
  from public.tickets t where t.id = p_ticket_id;
$$;
comment on function public.ticket_time_total(uuid) is 'Tiempo total continuo (RN §7).';

-- Tiempo neto: total menos los tramos clasificados como no contables.
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
      ), interval '0');
$$;
comment on function public.ticket_time_net(uuid) is 'Tiempo neto (excluye no contables).';

-- Suma por tipo de tramo.
create or replace function public.ticket_time_by_kind(p_ticket_id uuid, p_kind public.time_span_kind)
returns interval
language sql
stable
as $$
  select coalesce(sum(coalesce(ended_at, now()) - started_at), interval '0')
  from public.time_spans
  where ticket_id = p_ticket_id and kind = p_kind;
$$;

-- Registro manual de un tramo (RN §13: supervisor/admin, con validaciones).
create or replace function public.time_span_record(
  p_ticket_id uuid, p_kind public.time_span_kind,
  p_started_at timestamptz, p_ended_at timestamptz,
  p_clock_class public.clock_class default 'counted',
  p_client_request_id uuid default null)
returns uuid
language plpgsql
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
    ticket_id, cycle, kind, started_at, ended_at, clock_class, origin, recorded_by, client_request_id)
  select id, cycle, p_kind, p_started_at, p_ended_at, p_clock_class, 'manual', auth.uid(), p_client_request_id
  from public.tickets where id = p_ticket_id
  returning id into v_id;

  perform public.write_event(
    p_ticket_id, 'comment',
    jsonb_build_object('manual_time', true, 'kind', p_kind),
    null, null, null, null);
  return v_id;
end;
$$;
comment on function public.time_span_record(uuid, public.time_span_kind, timestamptz, timestamptz, public.clock_class, uuid) is
  'Registra un tramo manual; valida orden y pertenencia a la vida del tiquet.';

revoke execute on function public.time_span_record(uuid, public.time_span_kind, timestamptz, timestamptz, public.clock_class, uuid) from public;
grant execute on function public.time_span_record(uuid, public.time_span_kind, timestamptz, timestamptz, public.clock_class, uuid) to authenticated;
