-- Fase 5A, tramo 2: tiempo laboral.
-- Recorta los intervalos contra el calendario del equipo (o el de la instancia) y su zona horaria.
-- El modo calendario ya existe (ticket_time_total/net/by_kind); aquí se agrega la versión laboral.

create or replace function public.work_calendar_overlap(
  p_calendar_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
returns interval
language plpgsql
stable
as $$
declare
  v_tz text;
  v_day date;
  v_slot record;
  v_slot_start timestamptz;
  v_slot_end timestamptz;
  v_total interval := interval '0';
begin
  if p_start is null or p_end is null or p_end <= p_start then
    return interval '0';
  end if;
  if p_calendar_id is null then
    return p_end - p_start;
  end if;

  select timezone into v_tz
  from public.work_calendars where id = p_calendar_id and active;
  if v_tz is null then
    -- Calendario inexistente o inactivo: se comporta como continuo (modo calendario).
    return p_end - p_start;
  end if;

  for v_day in
    select d::date
    from generate_series(
      (p_start at time zone v_tz)::date,
      (p_end at time zone v_tz)::date,
      interval '1 day'
    ) as d
  loop
    if exists (
      select 1 from public.work_calendar_holidays h
      where h.calendar_id = p_calendar_id and h.holiday = v_day
    ) then
      continue;
    end if;

    for v_slot in
      select start_time, end_time
      from public.work_calendar_intervals
      where calendar_id = p_calendar_id
        and weekday = extract(dow from v_day)::smallint
    loop
      v_slot_start := (v_day + v_slot.start_time) at time zone v_tz;
      v_slot_end := (v_day + v_slot.end_time) at time zone v_tz;
      v_total := v_total + greatest(
        least(v_slot_end, p_end) - greatest(v_slot_start, p_start),
        interval '0'
      );
    end loop;
  end loop;

  return v_total;
end;
$$;
comment on function public.work_calendar_overlap(uuid, timestamptz, timestamptz) is
  'Recorta un intervalo contra el calendario laboral (franjas semanales, días no laborables y zona horaria).';
revoke execute on function public.work_calendar_overlap(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.work_calendar_overlap(uuid, timestamptz, timestamptz) to authenticated;

-- Calendario aplicable al tiquet: el del equipo, o el de la instancia.
create or replace function public.ticket_calendar(p_ticket_id uuid)
returns uuid
language sql
stable
as $$
  select coalesce(team.work_calendar_id, settings.default_calendar_id)
  from public.tickets t
  left join public.teams team on team.id = t.team_id
  cross join (select default_calendar_id from public.instance_settings limit 1) settings
  where t.id = p_ticket_id;
$$;
comment on function public.ticket_calendar(uuid) is
  'Calendario laboral del tiquet: el del equipo o el de la instancia.';
revoke execute on function public.ticket_calendar(uuid) from public, anon;
grant execute on function public.ticket_calendar(uuid) to authenticated;

-- Tiempo total laboral: del registro al cierre, recortado por el calendario.
create or replace function public.ticket_time_total_laboral(p_ticket_id uuid)
returns interval
language sql
stable
as $$
  select public.work_calendar_overlap(
    public.ticket_calendar(p_ticket_id),
    t.reported_at,
    coalesce(t.closed_at, now())
  )
  from public.tickets t where t.id = p_ticket_id;
$$;
comment on function public.ticket_time_total_laboral(uuid) is
  'Tiempo total en modo laboral (recortado por el calendario).';
revoke execute on function public.ticket_time_total_laboral(uuid) from public, anon;
grant execute on function public.ticket_time_total_laboral(uuid) to authenticated;

-- Tiempo laboral de un tipo de tramo.
create or replace function public.ticket_time_by_kind_laboral(
  p_ticket_id uuid,
  p_kind public.time_span_kind
)
returns interval
language sql
stable
as $$
  select coalesce(sum(public.work_calendar_overlap(
    public.ticket_calendar(p_ticket_id),
    ts.started_at,
    coalesce(ts.ended_at, now())
  )), interval '0')
  from public.time_spans ts
  where ts.ticket_id = p_ticket_id and ts.kind = p_kind and ts.voided_at is null;
$$;
comment on function public.ticket_time_by_kind_laboral(uuid, public.time_span_kind) is
  'Suma laboral por tipo de tramo (excluye anulados).';
revoke execute on function public.ticket_time_by_kind_laboral(uuid, public.time_span_kind) from public, anon;
grant execute on function public.ticket_time_by_kind_laboral(uuid, public.time_span_kind) to authenticated;

-- Tiempo neto laboral: total laboral menos los tramos no contables.
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
          coalesce(ts.ended_at, now())
        ))
        from public.time_spans ts
        where ts.ticket_id = p_ticket_id
          and ts.clock_class = 'not_counted'
          and ts.voided_at is null
      ), interval '0');
$$;
comment on function public.ticket_time_net_laboral(uuid) is
  'Tiempo neto en modo laboral (excluye no contables y anulados).';
revoke execute on function public.ticket_time_net_laboral(uuid) from public, anon;
grant execute on function public.ticket_time_net_laboral(uuid) to authenticated;
