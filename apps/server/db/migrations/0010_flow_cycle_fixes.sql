-- Correcciones del ciclo de vida:
--   * Una reasignación de supervisor cierra el trabajo activo o la pausa.
--   * Los tramos abiertos de un tiquet final se cortan en `closed_at`.
--   * La reconstrucción de tramos respeta el cierre por reasignación.

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
      update public.time_spans set ended_at = v_event.occurred_at
        where ticket_id = v_event.ticket_id
          and kind in ('active_work', 'pause')
          and ended_at is null;
      select max(occurred_at) into v_prev from public.ticket_events
        where ticket_id = v_event.ticket_id
          and type in ('taken', 'reassigned_supervisor')
          and occurred_at < v_event.occurred_at;
      insert into public.time_spans (ticket_id, cycle, kind, ref_id, started_at, ended_at)
      values (v_event.ticket_id, v_event.cycle, 'reassignment', v_event.reason_id,
              coalesce(v_prev, v_reported), v_event.occurred_at);

    elsif v_event.type = 'assigned_technician'
      or v_event.type = 'reassigned_technician' then
      select max(occurred_at) into v_prev from public.ticket_events
        where ticket_id = v_event.ticket_id and type = 'taken'
          and occurred_at <= v_event.occurred_at;
      insert into public.time_spans (ticket_id, cycle, kind, started_at, ended_at)
      values (v_event.ticket_id, v_event.cycle, 'technician_assignment',
              coalesce(v_prev, v_reported), v_event.occurred_at);

    elsif v_event.type = 'started' then
      select max(occurred_at) into v_prev from public.ticket_events
        where ticket_id = v_event.ticket_id
          and type in ('assigned_technician', 'reassigned_technician')
          and occurred_at <= v_event.occurred_at;
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

-- Un tiquet final (cerrado o descartado) no sigue acumulando trabajo ni pausa.
create or replace function public.ticket_time_by_kind(
  p_ticket_id uuid,
  p_kind public.time_span_kind
) returns interval
language sql
stable
as $$
  select coalesce(sum(
    greatest(coalesce(ts.ended_at, t.closed_at, now()), ts.started_at)
      - ts.started_at
  ), interval '0')
  from public.time_spans ts
  join public.tickets t on t.id = ts.ticket_id
  where ts.ticket_id = p_ticket_id
    and ts.kind = p_kind
    and ts.voided_at is null;
$$;

create or replace function public.ticket_time_by_kind_laboral(
  p_ticket_id uuid,
  p_kind public.time_span_kind
) returns interval
language sql
stable
as $$
  select coalesce(sum(public.work_calendar_overlap(
    public.ticket_calendar(p_ticket_id),
    ts.started_at,
    greatest(coalesce(ts.ended_at, t.closed_at, now()), ts.started_at)
  )), interval '0')
  from public.time_spans ts
  join public.tickets t on t.id = ts.ticket_id
  where ts.ticket_id = p_ticket_id
    and ts.kind = p_kind
    and ts.voided_at is null;
$$;

create or replace function public.ticket_time_net(p_ticket_id uuid)
returns interval
language sql
stable
as $$
  select public.ticket_time_total(p_ticket_id)
    - coalesce((
        select sum(
          greatest(coalesce(ts.ended_at, t.closed_at, now()), ts.started_at)
            - ts.started_at
        )
        from public.time_spans ts
        join public.tickets t on t.id = ts.ticket_id
        where ts.ticket_id = p_ticket_id
          and ts.clock_class = 'not_counted'
          and ts.voided_at is null
      ), interval '0');
$$;

create or replace function public.ticket_time_net_laboral(p_ticket_id uuid)
returns interval
language sql
stable
as $$
  select public.ticket_time_total_laboral(p_ticket_id)
    - coalesce((
        select sum(public.work_calendar_overlap(
          public.ticket_calendar(p_ticket_id),
          ts.started_at,
          greatest(coalesce(ts.ended_at, t.closed_at, now()), ts.started_at)
        ))
        from public.time_spans ts
        join public.tickets t on t.id = ts.ticket_id
        where ts.ticket_id = p_ticket_id
          and ts.clock_class = 'not_counted'
          and ts.voided_at is null
      ), interval '0');
$$;

-- El alta de tramos en tiempo real debe reconocer las reasignaciones de técnico
-- y cerrar el trabajo activo cuando se reasigna al supervisor.
create or replace function public.ticket_events_record_spans() returns trigger
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
    update public.time_spans set ended_at = new.occurred_at
      where ticket_id = new.ticket_id
        and kind in ('active_work', 'pause')
        and ended_at is null;
    select max(occurred_at) into v_prev from public.ticket_events
      where ticket_id = new.ticket_id
        and type in ('taken', 'reassigned_supervisor') and occurred_at < new.occurred_at;
    insert into public.time_spans (ticket_id, cycle, kind, ref_id, started_at, ended_at)
    values (new.ticket_id, new.cycle, 'reassignment', new.reason_id,
            coalesce(v_prev, v_reported), new.occurred_at);

  elsif new.type in ('assigned_technician', 'reassigned_technician') then
    select max(occurred_at) into v_prev from public.ticket_events
      where ticket_id = new.ticket_id and type = 'taken'
        and occurred_at <= new.occurred_at;
    insert into public.time_spans (ticket_id, cycle, kind, started_at, ended_at)
    values (new.ticket_id, new.cycle, 'technician_assignment',
            coalesce(v_prev, v_reported), new.occurred_at);

  elsif new.type = 'started' then
    select max(occurred_at) into v_prev from public.ticket_events
      where ticket_id = new.ticket_id
        and type in ('assigned_technician', 'reassigned_technician')
        and occurred_at <= new.occurred_at;
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
