begin;

set search_path = extensions, public;

select plan(44);

-- Tablas del tramo 1.
select has_table('public', 'instance_settings', 'existe public.instance_settings');
select has_table('public', 'work_calendars', 'existe public.work_calendars');
select has_table('public', 'work_calendar_intervals', 'existe public.work_calendar_intervals');
select has_table('public', 'work_calendar_holidays', 'existe public.work_calendar_holidays');
select has_table('public', 'teams', 'existe public.teams');
select has_table('public', 'buildings', 'existe public.buildings');
select has_table('public', 'locations', 'existe public.locations');
select has_table('public', 'dependencies', 'existe public.dependencies');
select has_table('public', 'categories', 'existe public.categories');
select has_table('public', 'subcategories', 'existe public.subcategories');
select has_table('public', 'problems', 'existe public.problems');
select has_table('public', 'service_types', 'existe public.service_types');
select has_table('public', 'priorities', 'existe public.priorities');
select has_table('public', 'channels', 'existe public.channels');
select has_table('public', 'reasons', 'existe public.reasons');

-- RLS activado en todas.
select is(
  (select relrowsecurity from pg_class where oid = 'public.instance_settings'::regclass),
  true, 'RLS activado en instance_settings');
select is(
  (select relrowsecurity from pg_class where oid = 'public.work_calendars'::regclass),
  true, 'RLS activado en work_calendars');
select is(
  (select relrowsecurity from pg_class where oid = 'public.work_calendar_intervals'::regclass),
  true, 'RLS activado en work_calendar_intervals');
select is(
  (select relrowsecurity from pg_class where oid = 'public.work_calendar_holidays'::regclass),
  true, 'RLS activado en work_calendar_holidays');
select is(
  (select relrowsecurity from pg_class where oid = 'public.teams'::regclass),
  true, 'RLS activado en teams');
select is(
  (select relrowsecurity from pg_class where oid = 'public.buildings'::regclass),
  true, 'RLS activado en buildings');
select is(
  (select relrowsecurity from pg_class where oid = 'public.locations'::regclass),
  true, 'RLS activado en locations');
select is(
  (select relrowsecurity from pg_class where oid = 'public.dependencies'::regclass),
  true, 'RLS activado en dependencies');
select is(
  (select relrowsecurity from pg_class where oid = 'public.categories'::regclass),
  true, 'RLS activado en categories');
select is(
  (select relrowsecurity from pg_class where oid = 'public.subcategories'::regclass),
  true, 'RLS activado en subcategories');
select is(
  (select relrowsecurity from pg_class where oid = 'public.problems'::regclass),
  true, 'RLS activado en problems');
select is(
  (select relrowsecurity from pg_class where oid = 'public.service_types'::regclass),
  true, 'RLS activado en service_types');
select is(
  (select relrowsecurity from pg_class where oid = 'public.priorities'::regclass),
  true, 'RLS activado en priorities');
select is(
  (select relrowsecurity from pg_class where oid = 'public.channels'::regclass),
  true, 'RLS activado en channels');
select is(
  (select relrowsecurity from pg_class where oid = 'public.reasons'::regclass),
  true, 'RLS activado en reasons');

-- La configuración admite una sola fila (la semilla ya insertó una).
select throws_ok(
  $$ insert into public.instance_settings (singleton) values (true) $$,
  '23505', null, 'no permite una segunda fila de configuración');

-- Motivos jerárquicos.
select lives_ok(
  $$ insert into public.reasons (use, name) values ('pause', 'Motivo de prueba') $$,
  'inserta un motivo raíz');
select lives_ok(
  $$ insert into public.reasons (use, name, parent_id)
     select 'pause', 'Submotivo de prueba', id from public.reasons where name = 'Motivo de prueba' $$,
  'inserta un subestado del mismo uso');
select throws_ok(
  $$ insert into public.reasons (use, name, parent_id)
     select 'rejection', 'Mal', id from public.reasons where name = 'Motivo de prueba' $$,
  'P0001', null, 'rechaza un hijo con uso distinto al padre');
select throws_ok(
  $$ insert into public.reasons (use, name) values ('pause', 'Motivo de prueba') $$,
  '23505', null, 'no repite un motivo raíz del mismo uso');

-- Catálogos.
select lives_ok(
  $$ insert into public.buildings (name) values ('Edificio A') $$,
  'inserta un edificio');
select throws_ok(
  $$ insert into public.buildings (name) values ('Edificio A') $$,
  '23505', null, 'no repite el nombre de edificio');
select lives_ok(
  $$ insert into public.locations (building_id, name)
     select id, 'Nivel A' from public.buildings where name = 'Edificio A' $$,
  'inserta una ubicación');
select throws_ok(
  $$ insert into public.locations (building_id, name)
     select id, 'Nivel A' from public.buildings where name = 'Edificio A' $$,
  '23505', null, 'no repite la ubicación dentro del edificio');
select throws_ok(
  $$ insert into public.priorities (name, target_minutes) values ('Prioridad Gamma', 0) $$,
  '23514', null, 'rechaza un tiempo objetivo no positivo');
select lives_ok(
  $$ insert into public.priorities (name, target_minutes) values ('Prioridad Gamma', 60) $$,
  'acepta un tiempo objetivo positivo');

-- Calendario y franjas.
select lives_ok(
  $$ insert into public.work_calendars (name, timezone) values ('Laboral', 'America/Mexico_City') $$,
  'inserta un calendario laboral');
select throws_ok(
  $$ insert into public.work_calendar_intervals (calendar_id, weekday, start_time, end_time)
     select id, 1, '18:00', '09:00' from public.work_calendars where name = 'Laboral' $$,
  '23514', null, 'rechaza una franja con fin anterior al inicio');
select lives_ok(
  $$ insert into public.work_calendar_intervals (calendar_id, weekday, start_time, end_time)
     select id, 1, '09:00', '18:00' from public.work_calendars where name = 'Laboral' $$,
  'acepta una franja válida');

select * from finish();

rollback;
