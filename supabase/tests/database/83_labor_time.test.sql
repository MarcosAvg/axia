begin;

set search_path = extensions, public;

select plan(15);

-- Columna y permiso nuevos.
select has_column('public', 'teams', 'work_calendar_id', 'teams tiene work_calendar_id');
select ok(
  exists (select 1 from public.permissions where id = 'metrics.view'),
  'existe el permiso metrics.view');

-- Calendarios de prueba (UTC) para un cálculo determinista.
insert into public.work_calendars (name, timezone) values ('Laboral UTC', 'UTC');
insert into public.work_calendar_intervals (calendar_id, weekday, start_time, end_time)
select c.id, d.weekday, '09:00', '18:00'
from public.work_calendars c, (values (1), (2), (3), (4), (5)) as d (weekday)
where c.name = 'Laboral UTC';

-- Calendario de la instancia con horas distintas: sirve de respaldo.
insert into public.work_calendars (name, timezone) values ('Instancia UTC', 'UTC');
insert into public.work_calendar_intervals (calendar_id, weekday, start_time, end_time)
select c.id, 1, '10:00', '12:00'
from public.work_calendars c where c.name = 'Instancia UTC';

-- Recorte directo (2026-10-05 es lunes; 2026-10-10, sábado).
select is(
  public.work_calendar_overlap(
    (select id from public.work_calendars where name = 'Laboral UTC'),
    '2026-10-05 09:00:00+00', '2026-10-05 18:00:00+00'),
  interval '9 hours', 'una jornada completa son 9 horas');
select is(
  public.work_calendar_overlap(
    (select id from public.work_calendars where name = 'Laboral UTC'),
    '2026-10-05 08:00:00+00', '2026-10-05 11:00:00+00'),
  interval '2 hours', 'recorta lo anterior a la jornada');
select is(
  public.work_calendar_overlap(
    (select id from public.work_calendars where name = 'Laboral UTC'),
    '2026-10-05 17:00:00+00', '2026-10-06 10:00:00+00'),
  interval '2 hours', 'suma lunes por la tarde y martes por la mañana');
select is(
  public.work_calendar_overlap(
    (select id from public.work_calendars where name = 'Laboral UTC'),
    '2026-10-10 00:00:00+00', '2026-10-11 00:00:00+00'),
  interval '0', 'el fin de semana no es laboral');
select is(
  public.work_calendar_overlap(null, '2026-10-05 08:00:00+00', '2026-10-05 11:00:00+00'),
  interval '3 hours', 'sin calendario se comporta como continuo');

-- Día no laborable.
insert into public.work_calendar_holidays (calendar_id, holiday)
select id, '2026-10-06' from public.work_calendars where name = 'Laboral UTC';
select is(
  public.work_calendar_overlap(
    (select id from public.work_calendars where name = 'Laboral UTC'),
    '2026-10-05 17:00:00+00', '2026-10-06 10:00:00+00'),
  interval '1 hour', 'el día no laborable se excluye');

-- Tiquet de prueba con calendario por equipo.
insert into public.teams (name, work_calendar_id)
  select 'Laboral A', id from public.work_calendars where name = 'Laboral UTC';
insert into public.teams (name) values ('Sin calendario');
insert into public.buildings (name) values ('Edificio Laboral');
insert into public.locations (building_id, name)
  select id, 'Nivel B' from public.buildings where name = 'Edificio Laboral';
insert into public.dependencies (name) values ('Dep Laboral');
insert into public.categories (team_id, name)
  select id, 'Cat A' from public.teams where name = 'Laboral A';
insert into public.categories (team_id, name)
  select id, 'Cat B' from public.teams where name = 'Sin calendario';
insert into public.service_types (name) values ('Serv Laboral');
insert into public.priorities (name) values ('Prio Laboral');
insert into public.channels (name) values ('Canal Laboral');
insert into public.requesters (full_name, dependency_id)
  select 'Req Laboral', d.id from public.dependencies d where d.name = 'Dep Laboral';

insert into public.tickets (
  folio, team_id, building_id, location_id, dependency_id, category_id,
  service_type_id, priority_id, channel_id, description, requester_id,
  requester_name, reported_at, closed_at)
select 'LAB-1', t.id, b.id, l.id, d.id, c.id, s.id, p.id, ch.id,
  'Tiquet laboral', r.id, 'Req Laboral',
  '2026-10-05 08:00:00+00', '2026-10-05 11:00:00+00'
from public.teams t, public.buildings b, public.locations l,
  public.dependencies d, public.categories c, public.service_types s,
  public.priorities p, public.channels ch, public.requesters r
where t.name = 'Laboral A' and b.name = 'Edificio Laboral'
  and l.name = 'Nivel B' and d.name = 'Dep Laboral' and c.name = 'Cat A'
  and s.name = 'Serv Laboral' and p.name = 'Prio Laboral'
  and ch.name = 'Canal Laboral' and r.full_name = 'Req Laboral';

insert into public.time_spans (ticket_id, cycle, kind, started_at, ended_at, clock_class)
  select id, 1, 'active_work', '2026-10-05 09:00:00+00', '2026-10-05 10:00:00+00', 'counted'
  from public.tickets where description = 'Tiquet laboral';
insert into public.time_spans (ticket_id, cycle, kind, started_at, ended_at, clock_class)
  select id, 1, 'active_work', '2026-10-05 08:00:00+00', '2026-10-05 09:00:00+00', 'counted'
  from public.tickets where description = 'Tiquet laboral';
insert into public.time_spans (ticket_id, cycle, kind, started_at, ended_at, clock_class)
  select id, 1, 'pause', '2026-10-05 10:00:00+00', '2026-10-05 11:00:00+00', 'not_counted'
  from public.tickets where description = 'Tiquet laboral';

select is(
  public.ticket_calendar((select id from public.tickets where description = 'Tiquet laboral')),
  (select id from public.work_calendars where name = 'Laboral UTC'),
  'el tiquet usa el calendario del equipo');
select is(
  public.ticket_time_total_laboral((select id from public.tickets where description = 'Tiquet laboral')),
  interval '2 hours', 'el total laboral recorta el tiquet a la jornada');
select is(
  public.ticket_time_by_kind_laboral(
    (select id from public.tickets where description = 'Tiquet laboral'), 'active_work'),
  interval '1 hour', 'el trabajo laboral solo cuenta dentro de la jornada');
select is(
  public.ticket_time_by_kind(
    (select id from public.tickets where description = 'Tiquet laboral'), 'active_work'),
  interval '2 hours', 'el modo calendario sí cuenta fuera de la jornada');
select is(
  public.ticket_time_net_laboral((select id from public.tickets where description = 'Tiquet laboral')),
  interval '1 hour', 'el neto laboral excluye lo no contable');

-- Respaldo al calendario de la instancia cuando el equipo no define uno.
update public.instance_settings
  set default_calendar_id = (select id from public.work_calendars where name = 'Instancia UTC');
insert into public.tickets (
  folio, team_id, building_id, location_id, dependency_id, category_id,
  service_type_id, priority_id, channel_id, description, requester_id,
  requester_name, reported_at, closed_at)
select 'LAB-2', t.id, b.id, l.id, d.id, c.id, s.id, p.id, ch.id,
  'Tiquet sin calendario de equipo', r.id, 'Req Laboral',
  '2026-10-05 08:00:00+00', '2026-10-05 11:00:00+00'
from public.teams t, public.buildings b, public.locations l,
  public.dependencies d, public.categories c, public.service_types s,
  public.priorities p, public.channels ch, public.requesters r
where t.name = 'Sin calendario' and b.name = 'Edificio Laboral'
  and l.name = 'Nivel B' and d.name = 'Dep Laboral' and c.name = 'Cat B'
  and s.name = 'Serv Laboral' and p.name = 'Prio Laboral'
  and ch.name = 'Canal Laboral' and r.full_name = 'Req Laboral';

select is(
  public.ticket_calendar((select id from public.tickets where description = 'Tiquet sin calendario de equipo')),
  (select id from public.work_calendars where name = 'Instancia UTC'),
  'sin calendario de equipo usa el de la instancia');
select is(
  public.ticket_time_total_laboral((select id from public.tickets where description = 'Tiquet sin calendario de equipo')),
  interval '1 hour', 'el respaldo usa las franjas del calendario de la instancia');

select * from finish();

rollback;
