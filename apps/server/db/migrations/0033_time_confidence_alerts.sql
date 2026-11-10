-- Confianza de la hora, alertas de desfase y tolerancia de reloj.
--
-- La hora de una acción en línea es now() de PostgreSQL. La de una acción
-- offline es la del dispositivo, pero provisional: se compara con deviceNow
-- al sincronizar y se marca trusted, unverified o corrected. Un evento
-- unverified crea una alerta y bloquea los desenlaces finales hasta corregir.

create type public.time_confidence as enum (
  'trusted',
  'unverified',
  'corrected'
);

alter table public.ticket_events
  add column time_confidence public.time_confidence not null default 'trusted',
  add column client_reported_at timestamptz,
  add column client_clock_skew_ms integer;

alter table public.time_spans
  add column time_confidence public.time_confidence not null default 'trusted';

alter table public.evidence
  add column client_captured_at timestamptz,
  add column time_confidence public.time_confidence not null default 'trusted';

alter table public.instance_settings
  add column time_sync_tolerance interval not null default '5 minutes',
  add constraint instance_settings_time_sync_tolerance_check
    check (time_sync_tolerance >= interval '0');

alter type public.event_type add value if not exists 'time_alert';

create table public.ticket_time_alerts (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id),
  event_id bigint not null references public.ticket_events(id),
  kind text not null check (
    kind in ('clock_skew', 'clock_unknown', 'out_of_order', 'future', 'too_old')
  ),
  status text not null default 'open' check (status in ('open', 'resolved')),
  client_clock_skew_ms integer,
  suggested_occurred_at timestamptz,
  detected_at timestamptz not null default now(),
  resolved_by uuid references public.users(id),
  resolved_at timestamptz,
  note text
);

create unique index ticket_time_alerts_one_open_per_event
  on public.ticket_time_alerts (event_id)
  where status = 'open';
create index ticket_time_alerts_ticket_open
  on public.ticket_time_alerts (ticket_id)
  where status = 'open';

comment on column public.ticket_events.time_confidence is
  'Confianza de la hora del evento: en línea/manual, no verificada o corregida.';
comment on column public.ticket_events.client_reported_at is
  'Hora reportada por el dispositivo; solo auditoría.';
comment on column public.ticket_events.client_clock_skew_ms is
  'Desfase medido del reloj del dispositivo al sincronizar; solo auditoría.';
comment on column public.time_spans.time_confidence is
  'Confianza copiada del evento que originó el tramo.';
comment on column public.evidence.client_captured_at is
  'Hora de captura reportada por el dispositivo; solo auditoría.';
comment on column public.evidence.time_confidence is
  'Confianza de la hora de la evidencia.';
comment on column public.instance_settings.time_sync_tolerance is
  'Desfase máximo aceptado entre el reloj del dispositivo y el servidor.';
comment on table public.ticket_time_alerts is
  'Alertas de desfase de reloj; bloquean desenlaces finales hasta corregirse.';

-- La auditoría del dispositivo queda inmutable. Solo se permite ajustar
-- occurred_at y time_confidence (al corregir la hora).
create or replace function public.prevent_event_mutation_except_time()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'La tabla % es de solo agregar', tg_table_name;
  end if;
  if new.ticket_id <> old.ticket_id
    or new.cycle <> old.cycle
    or new.type <> old.type
    or new.actor_id is distinct from old.actor_id
    or new.subject_user_id is distinct from old.subject_user_id
    or new.subject_technician_id is distinct from old.subject_technician_id
    or new.subject_requester_id is distinct from old.subject_requester_id
    or new.reason_id is distinct from old.reason_id
    or new.payload <> old.payload
    or new.client_request_id is distinct from old.client_request_id
    or new.recorded_at <> old.recorded_at
    or new.client_reported_at is distinct from old.client_reported_at
    or new.client_clock_skew_ms is distinct from old.client_clock_skew_ms
  then
    raise exception 'Solo se puede ajustar la hora de un evento';
  end if;
  return new;
end;
$$;

grant update (occurred_at, time_confidence) on public.ticket_events
  to axia_app;
grant select, insert, update on public.ticket_time_alerts to axia_app;
