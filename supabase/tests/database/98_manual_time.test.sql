begin;

set search_path = extensions, public;

select plan(9);

-- Fixtures.
insert into auth.users (id, email, raw_user_meta_data)
select v.id, v.email, jsonb_build_object('full_name', v.full_name)
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'admin@prueba.test', 'Admin'),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'tecnico@prueba.test', 'Técnico')
) as v (id, email, full_name);

insert into public.user_roles (user_id, role_id)
select v.uid, r.id
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'administrator'),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'technician')
) as v (uid, role_name)
join public.roles r on r.name = v.role_name;

insert into public.teams (name) values ('Mantenimiento');
insert into public.buildings (name) values ('Edificio A');
insert into public.locations (building_id, name)
  select id, 'PB' from public.buildings where name = 'Edificio A';
insert into public.dependencies (name) values ('Sistemas');
insert into public.categories (team_id, name)
  select id, 'Eléctrico' from public.teams where name = 'Mantenimiento';
insert into public.service_types (name) values ('Correctivo');
insert into public.priorities (name) values ('Media');
insert into public.channels (name) values ('Web');
insert into public.requesters (full_name, dependency_id)
  select 'Ana Pérez', d.id from public.dependencies d where d.name = 'Sistemas';
insert into public.technicians (full_name, team_id)
  select 'Luis Gómez', t.id from public.teams t where t.name = 'Mantenimiento';

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001"}', true);
select public.ticket_create(jsonb_build_object(
  'building_id', (select id from public.buildings where name = 'Edificio A'),
  'location_id', (select id from public.locations where name = 'PB'),
  'dependency_id', (select id from public.dependencies where name = 'Sistemas'),
  'category_id', (select id from public.categories where name = 'Eléctrico'),
  'service_type_id', (select id from public.service_types where name = 'Correctivo'),
  'priority_id', (select id from public.priorities where name = 'Media'),
  'channel_id', (select id from public.channels where name = 'Web'),
  'description', 'Manual',
  'requester_id', (select id from public.requesters where full_name = 'Ana Pérez')));

-- El tiquet lleva abierto dos horas; el tramo va de hace una hora a ahora.
update public.tickets
  set reported_at = now() - interval '2 hours'
  where description = 'Manual';

-- El admin registra un tramo manual atribuido al técnico.
select lives_ok(
  $$ select public.time_span_record(
       (select id from public.tickets where description = 'Manual'),
       'active_work',
       now() - interval '1 hour',
       now(),
       'counted',
       '00000000-0000-0000-0000-0000000000aa',
       (select id from public.technicians where full_name = 'Luis Gómez')) $$,
  'el admin registra un tramo manual con técnico sujeto');
select is(
  (select origin from public.time_spans
   where client_request_id = '00000000-0000-0000-0000-0000000000aa'),
  'manual'::public.span_origin, 'el tramo queda con origen manual');
select is(
  (select subject_technician_id from public.time_spans
   where client_request_id = '00000000-0000-0000-0000-0000000000aa'),
  (select id from public.technicians where full_name = 'Luis Gómez'),
  'el tramo queda atribuido al técnico');
select cmp_ok(
  public.ticket_time_by_kind(
    (select id from public.tickets where description = 'Manual'), 'active_work'),
  '>', interval '0', 'el tramo manual suma al tipo de tramo');

-- Anulación: deja de contar.
select lives_ok(
  $$ select public.time_span_void(
       (select id from public.tickets where description = 'Manual'),
       (select id from public.time_spans
        where client_request_id = '00000000-0000-0000-0000-0000000000aa')) $$,
  'el admin anula el tramo manual');
select isnt(
  (select voided_at from public.time_spans
   where client_request_id = '00000000-0000-0000-0000-0000000000aa'),
  null, 'el tramo queda marcado como anulado');
select is(
  public.ticket_time_by_kind(
    (select id from public.tickets where description = 'Manual'), 'active_work'),
  interval '0', 'el tramo anulado no cuenta');

-- Un técnico sin permiso no puede registrar tiempos.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000003"}', true);
select throws_ok(
  $$ select public.time_span_record(
       (select id from public.tickets where description = 'Manual'),
       'active_work',
       (select reported_at from public.tickets where description = 'Manual'),
       now()) $$,
  '42501', null, 'el técnico no registra tiempos manuales');

-- Validación de orden.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001"}', true);
select throws_ok(
  $$ select public.time_span_record(
       (select id from public.tickets where description = 'Manual'),
       'active_work', now(), now() - interval '1 hour') $$,
  'P0001', null, 'rechaza un fin anterior al inicio');

select * from finish();

rollback;
