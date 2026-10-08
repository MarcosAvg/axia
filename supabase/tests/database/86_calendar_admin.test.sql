begin;

set search_path = extensions, public;

select plan(15);

-- Fixtures (como postgres; las políticas se prueban después como `authenticated`).
insert into auth.users (id, email, raw_user_meta_data)
select v.id, v.email, jsonb_build_object('full_name', v.full_name)
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'admin@cal.test', 'Admin'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'supervisor@cal.test', 'Supervisor')
) as v (id, email, full_name);

insert into public.user_roles (user_id, role_id)
select v.uid, r.id
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'administrator'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'supervisor')
) as v (uid, role_name)
join public.roles r on r.name = v.role_name;

insert into public.teams (name) values ('Cal Team');

-- 1. El administrador administra calendarios, franjas y festivos.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001"}', true);

select lives_ok(
  $$ insert into public.work_calendars (name, timezone) values ('Admin Cal', 'America/Mexico_City') $$,
  'el admin crea un calendario');
select lives_ok(
  $$ insert into public.work_calendar_intervals (calendar_id, weekday, start_time, end_time)
     select id, 1, '09:00', '18:00' from public.work_calendars where name = 'Admin Cal' $$,
  'el admin agrega una franja');
select lives_ok(
  $$ insert into public.work_calendar_holidays (calendar_id, holiday, name)
     select id, '2028-01-01', 'Año Nuevo' from public.work_calendars where name = 'Admin Cal' $$,
  'el admin agrega un festivo');
select lives_ok(
  $$ update public.work_calendars set timezone = 'UTC' where name = 'Admin Cal' $$,
  'el admin edita el calendario');
select is(
  (select timezone from public.work_calendars where name = 'Admin Cal'),
  'UTC', 'la zona horaria quedó editada');
select lives_ok(
  $$ delete from public.work_calendar_intervals
     where calendar_id = (select id from public.work_calendars where name = 'Admin Cal') $$,
  'el admin quita una franja');
select is(
  (select count(*)::int from public.work_calendar_intervals i
     join public.work_calendars c on c.id = i.calendar_id where c.name = 'Admin Cal'),
  0, 'la franja quedó retirada');
select lives_ok(
  $$ delete from public.work_calendar_holidays
     where calendar_id = (select id from public.work_calendars where name = 'Admin Cal') $$,
  'el admin quita un festivo');
select is(
  (select count(*)::int from public.work_calendar_holidays h
     join public.work_calendars c on c.id = h.calendar_id where c.name = 'Admin Cal'),
  0, 'el festivo quedó retirado');
select lives_ok(
  $$ update public.teams
     set work_calendar_id = (select id from public.work_calendars where name = 'Admin Cal')
     where name = 'Cal Team' $$,
  'el admin asigna un calendario al equipo');
select is(
  (select work_calendar_id from public.teams where name = 'Cal Team'),
  (select id from public.work_calendars where name = 'Admin Cal'),
  'el equipo quedó con su calendario');
select lives_ok(
  $$ insert into public.work_calendar_holidays (calendar_id, holiday, name)
     select id, '2028-02-01', 'Otro' from public.work_calendars where name = 'Admin Cal' $$,
  'el admin agrega otro festivo');

-- 2. Un no-admin (supervisor) no puede escribir.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002"}', true);

select throws_ok(
  $$ insert into public.work_calendars (name, timezone) values ('Nope', 'UTC') $$,
  '42501', null, 'un no-admin no crea calendarios');
delete from public.work_calendar_holidays
  where calendar_id = (select id from public.work_calendars where name = 'Admin Cal');
select is(
  (select count(*)::int from public.work_calendar_holidays h
     join public.work_calendars c on c.id = h.calendar_id where c.name = 'Admin Cal'),
  1, 'un no-admin no borra festivos');
update public.work_calendars set name = 'hack' where name = 'Admin Cal';
select is(
  (select name from public.work_calendars where name = 'Admin Cal'),
  'Admin Cal', 'un no-admin no renombra calendarios');

reset role;

select * from finish();

rollback;
