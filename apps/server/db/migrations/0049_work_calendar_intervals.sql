-- Intervalos laborales sin solapamientos y con turnos que cruzan medianoche.

alter table public.work_calendar_intervals
  drop constraint work_calendar_intervals_check;
alter table public.work_calendar_intervals
  add constraint work_calendar_intervals_check check (start_time <> end_time);

create or replace function public.work_calendar_intervals_no_overlap()
returns trigger
language plpgsql
as $$
declare
  v_start integer;
  v_end integer;
  v_os integer;
  v_oe integer;
  v_shift integer;
  v_other record;
begin
  v_start := new.weekday * 1440
    + extract(hour from new.start_time)::int * 60
    + extract(minute from new.start_time)::int;
  v_end := new.weekday * 1440
    + extract(hour from new.end_time)::int * 60
    + extract(minute from new.end_time)::int;
  if v_end <= v_start then
    v_end := v_end + 1440;
  end if;

  for v_other in
    select * from public.work_calendar_intervals
    where calendar_id = new.calendar_id and id <> new.id
  loop
    v_os := v_other.weekday * 1440
      + extract(hour from v_other.start_time)::int * 60
      + extract(minute from v_other.start_time)::int;
    v_oe := v_other.weekday * 1440
      + extract(hour from v_other.end_time)::int * 60
      + extract(minute from v_other.end_time)::int;
    if v_oe <= v_os then
      v_oe := v_oe + 1440;
    end if;

    for v_shift in select unnest(array[-10080, 0, 10080])
    loop
      if v_start < v_oe + v_shift and v_os + v_shift < v_end then
        raise exception 'Los intervalos del calendario no pueden solaparse'
          using errcode = '23514';
      end if;
    end loop;
  end loop;
  return new;
end;
$$;

drop trigger if exists work_calendar_intervals_no_overlap
  on public.work_calendar_intervals;
create trigger work_calendar_intervals_no_overlap
  before insert or update on public.work_calendar_intervals
  for each row execute function public.work_calendar_intervals_no_overlap();

create or replace function public.work_calendar_overlap(
  p_calendar_id uuid,
  p_start timestamp with time zone,
  p_end timestamp with time zone
) returns interval
language plpgsql stable
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
      if v_slot.end_time > v_slot.start_time then
        v_slot_end := (v_day + v_slot.end_time) at time zone v_tz;
      else
        v_slot_end := (v_day + 1 + v_slot.end_time) at time zone v_tz;
      end if;
      v_total := v_total + greatest(
        least(v_slot_end, p_end) - greatest(v_slot_start, p_start),
        interval '0'
      );
    end loop;
  end loop;

  return v_total;
end;
$$;
