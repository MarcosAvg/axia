-- Tiempos por acción y corrección de la hora de un evento.
--
-- La hora de cada acción vive en ticket_events.occurred_at. Los tramos
-- derivados se reconstruyen cuando se corrige una acción. Ya no se crean
-- tramos manuales independientes.

alter type public.event_type add value if not exists 'event_time_corrected';

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
    or new.reason_id is distinct from old.reason_id
    or new.payload <> old.payload
    or new.client_request_id is distinct from old.client_request_id
    or new.recorded_at <> old.recorded_at
  then
    raise exception 'Solo se puede ajustar la hora de un evento';
  end if;
  return new;
end;
$$;

drop trigger if exists ticket_events_no_mutation on public.ticket_events;
create trigger ticket_events_no_mutation
  before update or delete on public.ticket_events
  for each row execute function public.prevent_event_mutation_except_time();

grant update (occurred_at) on public.ticket_events to axia_app;

update public.permissions
set description = 'Ajustar la hora de las acciones'
where id = 'time.record_manual';

delete from public.time_spans where origin = 'manual';

alter table public.time_spans
  drop constraint if exists time_spans_replaces_span_id_fkey;
drop index if exists public.idx_time_spans_replaces;
alter table public.time_spans
  drop column if exists replaces_span_id;

create or replace function public.rebuild_ticket_time_spans(p_ticket_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reported timestamptz;
  v_prev timestamptz;
  v_clock public.clock_class;
  v_event record;
begin
  select reported_at into v_reported
  from public.tickets where id = p_ticket_id;

  delete from public.time_spans
  where ticket_id = p_ticket_id and origin = 'system';

  for v_event in
    select * from public.ticket_events
    where ticket_id = p_ticket_id
    order by occurred_at, id
  loop
    if v_event.type = 'taken' then
      insert into public.time_spans (ticket_id, cycle, kind, started_at, ended_at)
      values (v_event.ticket_id, v_event.cycle, 'supervisor_response', v_reported, v_event.occurred_at);

    elsif v_event.type = 'reassigned_supervisor' then
      select max(occurred_at) into v_prev from public.ticket_events
        where ticket_id = v_event.ticket_id
          and type in ('taken', 'reassigned_supervisor')
          and occurred_at < v_event.occurred_at;
      insert into public.time_spans (ticket_id, cycle, kind, ref_id, started_at, ended_at)
      values (v_event.ticket_id, v_event.cycle, 'reassignment', v_event.reason_id,
              coalesce(v_prev, v_reported), v_event.occurred_at);

    elsif v_event.type = 'assigned_technician' then
      select max(occurred_at) into v_prev from public.ticket_events
        where ticket_id = v_event.ticket_id and type = 'taken';
      insert into public.time_spans (ticket_id, cycle, kind, started_at, ended_at)
      values (v_event.ticket_id, v_event.cycle, 'technician_assignment',
              coalesce(v_prev, v_reported), v_event.occurred_at);

    elsif v_event.type = 'started' then
      select max(occurred_at) into v_prev from public.ticket_events
        where ticket_id = v_event.ticket_id and type = 'assigned_technician';
      insert into public.time_spans (ticket_id, cycle, kind, started_at, ended_at)
      values (v_event.ticket_id, v_event.cycle, 'wait_start',
              coalesce(v_prev, v_reported), v_event.occurred_at);
      insert into public.time_spans (ticket_id, cycle, kind, started_at)
      values (v_event.ticket_id, v_event.cycle, 'active_work', v_event.occurred_at);

    elsif v_event.type = 'paused' then
      update public.time_spans set ended_at = v_event.occurred_at
        where ticket_id = v_event.ticket_id and kind = 'active_work' and ended_at is null;
      select clock_class into v_clock from public.reasons where id = v_event.reason_id;
      insert into public.time_spans (ticket_id, cycle, kind, ref_id, started_at, clock_class)
      values (v_event.ticket_id, v_event.cycle, 'pause', v_event.reason_id,
              v_event.occurred_at, coalesce(v_clock, 'counted'));

    elsif v_event.type = 'pause_advanced' then
      update public.time_spans set ended_at = v_event.occurred_at
        where ticket_id = v_event.ticket_id and kind = 'pause' and ended_at is null;
      select clock_class into v_clock from public.reasons where id = v_event.reason_id;
      insert into public.time_spans (ticket_id, cycle, kind, ref_id, started_at, clock_class)
      values (v_event.ticket_id, v_event.cycle, 'pause', v_event.reason_id,
              v_event.occurred_at, coalesce(v_clock, 'counted'));

    elsif v_event.type = 'resumed' then
      if v_event.reason_id is not null then
        select clock_class into v_clock from public.reasons where id = v_event.reason_id;
        update public.time_spans
        set ref_id = v_event.reason_id, clock_class = coalesce(v_clock, 'counted')
        where ticket_id = v_event.ticket_id and kind = 'pause' and ended_at is null;
      end if;
      update public.time_spans set ended_at = v_event.occurred_at
        where ticket_id = v_event.ticket_id and kind = 'pause' and ended_at is null;
      insert into public.time_spans (ticket_id, cycle, kind, started_at)
      values (v_event.ticket_id, v_event.cycle, 'active_work', v_event.occurred_at);

    elsif v_event.type = 'attended' then
      update public.time_spans set ended_at = v_event.occurred_at
        where ticket_id = v_event.ticket_id and kind = 'active_work' and ended_at is null;
      insert into public.time_spans (ticket_id, cycle, kind, started_at)
      values (v_event.ticket_id, v_event.cycle, 'validation', v_event.occurred_at);

    elsif v_event.type = 'validated' then
      if (select status from public.tickets where id = v_event.ticket_id) = 'closed' then
        update public.time_spans set ended_at = v_event.occurred_at
          where ticket_id = v_event.ticket_id and kind = 'validation' and ended_at is null;
      end if;

    elsif v_event.type = 'claim_opened' then
      update public.time_spans set ended_at = v_event.occurred_at
        where ticket_id = v_event.ticket_id and kind = 'validation' and ended_at is null;
      insert into public.time_spans (ticket_id, cycle, kind, started_at)
      values (v_event.ticket_id, v_event.cycle, 'claim', v_event.occurred_at);

    elsif v_event.type in ('claim_resolved', 'reopened') then
      update public.time_spans set ended_at = v_event.occurred_at
        where ticket_id = v_event.ticket_id and kind = 'claim' and ended_at is null;

    elsif v_event.type = 'duplicate_marked' then
      insert into public.time_spans (ticket_id, cycle, kind, started_at, ended_at)
      values (v_event.ticket_id, v_event.cycle, 'duplicate_review', v_reported, v_event.occurred_at);
    end if;
  end loop;
end;
$$;

comment on function public.rebuild_ticket_time_spans(uuid) is
  'Reconstruye los tramos de sistema de un tiquet desde el historial de eventos.';
