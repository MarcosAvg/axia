begin;

set search_path = extensions, public;

select plan(12);

select has_table('public', 'time_spans', 'existe public.time_spans');
select is(
  (select relrowsecurity from pg_class where oid = 'public.time_spans'::regclass),
  true, 'RLS activado en time_spans');

-- Fixtures.
insert into auth.users (id) values
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000004');
insert into public.profiles (id, full_name) values
  ('00000000-0000-0000-0000-000000000001', 'Admin'),
  ('00000000-0000-0000-0000-000000000002', 'Supervisor'),
  ('00000000-0000-0000-0000-000000000003', 'Técnico'),
  ('00000000-0000-0000-0000-000000000004', 'Solicitante');
insert into public.user_roles (user_id, role_id)
select v.uid, r.id from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'administrator'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'supervisor'),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'technician'),
  ('00000000-0000-0000-0000-000000000004'::uuid, 'requester')
) as v (uid, role_name) join public.roles r on r.name = v.role_name;
insert into public.teams (name) values ('Mantenimiento');
insert into public.buildings (name) values ('Edificio A');
insert into public.locations (building_id, name)
  select id, 'Planta baja' from public.buildings where name = 'Edificio A';
insert into public.dependencies (name) values ('Sistemas');
insert into public.categories (team_id, name)
  select id, 'Eléctrico' from public.teams where name = 'Mantenimiento';
insert into public.service_types (name) values ('Correctivo');
insert into public.priorities (name) values ('Media');
insert into public.channels (name) values ('Web');
insert into public.requesters (full_name, contact, dependency_id, user_id)
  select 'Ana Pérez', 'ext. 1', d.id, '00000000-0000-0000-0000-000000000004'
  from public.dependencies d where d.name = 'Sistemas';
insert into public.technicians (full_name, user_id, team_id)
  select 'Luis Gómez', '00000000-0000-0000-0000-000000000003', t.id
  from public.teams t where t.name = 'Mantenimiento';
insert into public.technician_categories (technician_id, category_id)
  select tech.id, c.id from public.technicians tech, public.categories c
  where tech.full_name = 'Luis Gómez' and c.name = 'Eléctrico';
insert into public.supervisor_scopes (user_id, team_id)
  select '00000000-0000-0000-0000-000000000002', t.id
  from public.teams t where t.name = 'Mantenimiento';
insert into public.supervisor_scope_buildings (scope_id, building_id)
  select ss.id, b.id from public.supervisor_scopes ss, public.buildings b
  where ss.user_id = '00000000-0000-0000-0000-000000000002' and b.name = 'Edificio A';
update public.instance_settings set validation_policy = 'supervisor';

-- Motivo de pausa no contable (para probar el tiempo neto).
insert into public.reasons (use, name, clock_class)
  values ('pause', 'Esperando al solicitante', 'not_counted');

-- Recorre el flujo.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001"}', true);
select public.ticket_create(jsonb_build_object(
  'building_id', (select id from public.buildings where name = 'Edificio A'),
  'location_id', (select id from public.locations where name = 'Planta baja'),
  'dependency_id', (select id from public.dependencies where name = 'Sistemas'),
  'category_id', (select id from public.categories where name = 'Eléctrico'),
  'service_type_id', (select id from public.service_types where name = 'Correctivo'),
  'priority_id', (select id from public.priorities where name = 'Media'),
  'channel_id', (select id from public.channels where name = 'Web'),
  'description', 'Falla',
  'requester_id', (select id from public.requesters where full_name = 'Ana Pérez')));

-- El registro ocurrió hace 3 horas (para que haya tiempo medible).
update public.tickets set reported_at = now() - interval '3 hours'
  where id = (select id from public.tickets order by ticket_number limit 1);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002"}', true);
select public.ticket_take((select id from public.tickets order by ticket_number limit 1));
select public.ticket_assign_technician(
  (select id from public.tickets order by ticket_number limit 1),
  (select id from public.technicians where full_name = 'Luis Gómez'));

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000003"}', true);
insert into public.evidence (ticket_id, cycle, type)
  select id, cycle, 'before' from public.tickets order by ticket_number limit 1;
select public.ticket_start((select id from public.tickets order by ticket_number limit 1));
select public.ticket_pause(
  (select id from public.tickets order by ticket_number limit 1),
  (select id from public.reasons where name = 'Esperando al solicitante'));
select public.ticket_resume((select id from public.tickets order by ticket_number limit 1));
insert into public.evidence (ticket_id, cycle, type)
  select id, cycle, 'after' from public.tickets order by ticket_number limit 1;
select public.ticket_attend(
  (select id from public.tickets order by ticket_number limit 1), 'Listo');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002"}', true);
select public.ticket_validate((select id from public.tickets order by ticket_number limit 1));

-- Tramos registrados por el disparador.
select ok(
  exists (select 1 from public.time_spans where kind = 'supervisor_response'),
  'registra el tramo de respuesta del supervisor');
select ok(
  exists (select 1 from public.time_spans where kind = 'technician_assignment'),
  'registra el tramo de asignación de técnico');
select ok(
  exists (select 1 from public.time_spans where kind = 'active_work' and ended_at is not null),
  'cierra el tramo de trabajo activo');
select ok(
  exists (select 1 from public.time_spans where kind = 'pause' and clock_class = 'not_counted'),
  'la pausa copia la clasificación de reloj no contable');
select ok(
  exists (select 1 from public.time_spans where kind = 'validation' and ended_at is not null),
  'cierra el tramo de validación al cerrar el tiquet');

-- Cálculo de tiempos.
select cmp_ok(
  public.ticket_time_total((select id from public.tickets order by ticket_number limit 1)),
  '>', interval '0', 'el tiempo total es positivo');

insert into public.time_spans (ticket_id, cycle, kind, started_at, ended_at, clock_class, origin)
select id, cycle, 'pause', now() - interval '1 hour', now(), 'not_counted', 'manual'
from public.tickets order by ticket_number limit 1;

select cmp_ok(
  public.ticket_time_net((select id from public.tickets order by ticket_number limit 1)),
  '<',
  public.ticket_time_total((select id from public.tickets order by ticket_number limit 1)),
  'el tiempo neto descuenta los tramos no contables');

-- Registro manual con validaciones.
select lives_ok(
  $$ select public.time_span_record(
       (select id from public.tickets order by ticket_number limit 1),
       'active_work', now() - interval '2 hours', now() - interval '1 hour') $$,
  'registra un tramo manual válido');
select throws_ok(
  $$ select public.time_span_record(
       (select id from public.tickets order by ticket_number limit 1),
       'active_work', now() - interval '1 hour', now() - interval '2 hours') $$,
  'P0001', null, 'rechaza un tramo con fin anterior al inicio');
select throws_ok(
  $$ select public.time_span_record(
       (select id from public.tickets order by ticket_number limit 1),
       'active_work', now() - interval '5 hours', now() - interval '4 hours') $$,
  'P0001', null, 'rechaza un tramo fuera de la vida del tiquet');

select * from finish();

rollback;
