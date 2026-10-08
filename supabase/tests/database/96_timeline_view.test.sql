begin;

set search_path = extensions, public;

select plan(5);

-- Aísla las pruebas de tiquets que hayan quedado de la app o de las pruebas E2E.
truncate table public.tickets cascade;

select has_view('public', 'v_ticket_timeline', 'existe la vista de línea de tiempo');

-- Fixtures.
insert into auth.users (id, email, raw_user_meta_data)
select v.id, v.email, jsonb_build_object('full_name', v.full_name)
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'admin@prueba.test', 'Admin'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'supervisor@prueba.test', 'Supervisor'),
  ('00000000-0000-0000-0000-000000000004'::uuid, 'solicitante@prueba.test', 'Solicitante')
) as v (id, email, full_name);

insert into public.user_roles (user_id, role_id)
select v.uid, r.id
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'administrator'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'supervisor'),
  ('00000000-0000-0000-0000-000000000004'::uuid, 'requester')
) as v (uid, role_name)
join public.roles r on r.name = v.role_name;

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
insert into public.supervisor_scopes (user_id, team_id)
  select '00000000-0000-0000-0000-000000000002', t.id
  from public.teams t where t.name = 'Mantenimiento';
insert into public.supervisor_scope_buildings (scope_id, building_id)
  select ss.id, b.id from public.supervisor_scopes ss, public.buildings b
  where ss.user_id = '00000000-0000-0000-0000-000000000002' and b.name = 'Edificio A';

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001"}', true);
select public.ticket_create(jsonb_build_object(
  'building_id', (select id from public.buildings where name = 'Edificio A'),
  'location_id', (select id from public.locations where name = 'Planta baja'),
  'dependency_id', (select id from public.dependencies where name = 'Sistemas'),
  'category_id', (select id from public.categories where name = 'Eléctrico'),
  'service_type_id', (select id from public.service_types where name = 'Correctivo'),
  'priority_id', (select id from public.priorities where name = 'Media'),
  'channel_id', (select id from public.channels where name = 'Web'),
  'description', 'No enciende la luz',
  'requester_id', (select id from public.requesters where full_name = 'Ana Pérez')));

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002"}', true);
select public.ticket_take((select id from public.tickets limit 1));
select public.ticket_comment((select id from public.tickets limit 1), 'nota interna', true);

-- El personal ve todo.
select cmp_ok(
  (select count(*)::int from public.v_ticket_timeline where type = 'taken'), '>=', 1,
  'el supervisor ve los eventos del tiquet');
select is(
  (select count(*)::int from public.v_ticket_timeline where type = 'comment'), 1,
  'el supervisor ve los comentarios internos');

-- El solicitante solo ve los tipos configurados.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000004"}', true);
select cmp_ok(
  (select count(*)::int from public.v_ticket_timeline where type = 'taken'), '>=', 1,
  'el solicitante ve los eventos configurados');
select is(
  (select count(*)::int from public.v_ticket_timeline where type = 'comment'), 0,
  'el solicitante no ve los comentarios internos');

select * from finish();

rollback;
