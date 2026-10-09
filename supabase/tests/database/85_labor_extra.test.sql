begin;

set search_path = extensions, public;

select plan(12);

-- Semilla de calendarios por equipo y festivos oficiales.
select ok(
  exists (select 1 from public.work_calendars where name = 'Mantenimiento'),
  'existe el calendario de Mantenimiento');
select is(
  (select count(*)::int from public.work_calendar_intervals i
     join public.work_calendars c on c.id = i.calendar_id
   where c.name = 'Mantenimiento' and i.start_time = '06:00' and i.end_time = '20:00'),
  5, 'Mantenimiento cubre de 06:00 a 20:00 de lunes a viernes');
select is(
  (select count(*)::int from public.work_calendar_intervals i
     join public.work_calendars c on c.id = i.calendar_id
   where c.name = 'Oficina' and i.start_time = '08:00' and i.end_time = '17:00'),
  5, 'Oficina cubre de 08:00 a 17:00 de lunes a viernes');
select is(
  (select work_calendar_id from public.teams where name = 'Mantenimiento'),
  (select id from public.work_calendars where name = 'Mantenimiento'),
  'el equipo de Mantenimiento usa su calendario');
select cmp_ok(
  (select count(*)::int from public.work_calendar_holidays h
     join public.work_calendars c on c.id = h.calendar_id
   where c.name = 'Mantenimiento'),
  '>=', 14, 'los festivos oficiales quedan sembrados y son editables');

-- Tiquet con trabajo dentro y fuera de horario.
insert into public.work_calendars (name, timezone) values ('Extra UTC', 'UTC');
insert into public.work_calendar_intervals (calendar_id, weekday, start_time, end_time)
select c.id, d.weekday, '09:00', '18:00'
from public.work_calendars c, (values (1), (2), (3), (4), (5)) as d (weekday)
where c.name = 'Extra UTC';

insert into public.teams (name, work_calendar_id)
  select 'Extra T', id from public.work_calendars where name = 'Extra UTC';
insert into public.buildings (name) values ('Edificio Extra');
insert into public.locations (building_id, name)
  select id, 'Piso E' from public.buildings where name = 'Edificio Extra';
insert into public.dependencies (name) values ('Dep Extra');
insert into public.categories (team_id, name)
  select id, 'Cat Extra' from public.teams where name = 'Extra T';
insert into public.service_types (name) values ('Serv Extra');
insert into public.priorities (name) values ('Prio Extra');
insert into public.channels (name) values ('Canal Extra');
insert into public.requesters (full_name, dependency_id)
  select 'Req Extra', d.id from public.dependencies d where d.name = 'Dep Extra';
insert into public.technicians (full_name, team_id)
  select 'Extra Tech', t.id from public.teams t where t.name = 'Extra T';

insert into public.tickets (
  team_id, building_id, location_id, dependency_id, category_id,
  service_type_id, priority_id, channel_id, description, requester_id,
  requester_name, status, reported_at, closed_at)
select t.id, b.id, l.id, d.id, c.id, s.id, p.id, ch.id, 'Extra trabajo', r.id,
  'Req Extra', 'closed', '2026-10-05 06:00:00+00', '2026-10-05 21:00:00+00'
from public.teams t, public.buildings b, public.locations l,
  public.dependencies d, public.categories c, public.service_types s,
  public.priorities p, public.channels ch, public.requesters r
where t.name = 'Extra T' and b.name = 'Edificio Extra' and l.name = 'Piso E'
  and d.name = 'Dep Extra' and c.name = 'Cat Extra' and s.name = 'Serv Extra'
  and p.name = 'Prio Extra' and ch.name = 'Canal Extra' and r.full_name = 'Req Extra';

insert into public.time_spans (ticket_id, cycle, kind, started_at, ended_at, clock_class)
  select id, 1, k.kind::public.time_span_kind, k.start_at, k.end_at, 'counted'
  from public.tickets,
    (values
      ('active_work', '2026-10-05 07:00:00+00'::timestamptz, '2026-10-05 09:00:00+00'::timestamptz),
      ('active_work', '2026-10-05 09:00:00+00'::timestamptz, '2026-10-05 10:00:00+00'::timestamptz),
      ('active_work', '2026-10-05 18:00:00+00'::timestamptz, '2026-10-05 20:00:00+00'::timestamptz)
    ) as k (kind, start_at, end_at)
  where description = 'Extra trabajo';

insert into public.ticket_participants (ticket_id, cycle, technician_id, participation_type, started_at, ended_at)
  select tk.id, 1, te.id, 'leader', '2026-10-05 07:00:00+00', '2026-10-05 20:00:00+00'
  from public.tickets tk, public.technicians te
  where tk.description = 'Extra trabajo' and te.full_name = 'Extra Tech';

select is(
  public.ticket_time_by_kind((select id from public.tickets where description = 'Extra trabajo'), 'active_work'),
  interval '5 hours', 'el modo calendario cuenta todo el trabajo');
select is(
  public.ticket_time_by_kind_laboral((select id from public.tickets where description = 'Extra trabajo'), 'active_work'),
  interval '1 hour', 'el modo laboral solo cuenta lo que cae en horario');
select is(
  public.ticket_time_by_kind_extra((select id from public.tickets where description = 'Extra trabajo'), 'active_work'),
  interval '4 hours', 'el extra es el trabajo fuera de horario');
select is(
  (select active_work_time_extra from public.v_ticket_metrics_base
   where folio = (select folio from public.tickets where description = 'Extra trabajo')),
  interval '4 hours', 'la vista base expone el trabajo fuera de horario');
select is(
  (select participation_time_extra from public.v_metrics_by_technician where technician_name = 'Extra Tech'),
  interval '4 hours', 'la carga por técnico separa el tiempo fuera de horario');

-- Trabajo en un día festivo: no cuenta como laboral, pero sí como extra.
insert into public.work_calendar_holidays (calendar_id, holiday, name)
  select id, '2026-10-06', 'Festivo de prueba' from public.work_calendars where name = 'Extra UTC';
insert into public.tickets (
  team_id, building_id, location_id, dependency_id, category_id,
  service_type_id, priority_id, channel_id, description, requester_id,
  requester_name, status, reported_at, closed_at)
select t.id, b.id, l.id, d.id, c.id, s.id, p.id, ch.id, 'Extra festivo', r.id,
  'Req Extra', 'closed', '2026-10-06 09:00:00+00', '2026-10-06 12:00:00+00'
from public.teams t, public.buildings b, public.locations l,
  public.dependencies d, public.categories c, public.service_types s,
  public.priorities p, public.channels ch, public.requesters r
where t.name = 'Extra T' and b.name = 'Edificio Extra' and l.name = 'Piso E'
  and d.name = 'Dep Extra' and c.name = 'Cat Extra' and s.name = 'Serv Extra'
  and p.name = 'Prio Extra' and ch.name = 'Canal Extra' and r.full_name = 'Req Extra';
insert into public.time_spans (ticket_id, cycle, kind, started_at, ended_at, clock_class)
  select id, 1, 'active_work', '2026-10-06 10:00:00+00', '2026-10-06 11:00:00+00', 'counted'
  from public.tickets where description = 'Extra festivo';

select is(
  public.ticket_time_by_kind_laboral((select id from public.tickets where description = 'Extra festivo'), 'active_work'),
  interval '0', 'un festivo trabajado no cuenta como laboral');
select is(
  public.ticket_time_by_kind_extra((select id from public.tickets where description = 'Extra festivo'), 'active_work'),
  interval '1 hour', 'un festivo trabajado cuenta como extra');

select * from finish();

rollback;
