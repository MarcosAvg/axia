begin;

set search_path = extensions, public;

select plan(10);

-- Semillas.
select cmp_ok((select count(*)::int from public.teams), '>=', 2, 'se sembraron equipos');
select cmp_ok((select count(*)::int from public.reasons), '>', 0, 'se sembraron motivos');
select cmp_ok((select count(*)::int from public.priorities), '>=', 4, 'se sembraron prioridades');

-- Fixtures.
insert into auth.users (id) values
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000004');
insert into public.profiles (id, full_name) values
  ('00000000-0000-0000-0000-000000000001', 'Admin'),
  ('00000000-0000-0000-0000-000000000002', 'Supervisor'),
  ('00000000-0000-0000-0000-000000000003', 'Solicitante'),
  ('00000000-0000-0000-0000-000000000004', 'Otro');
insert into public.user_roles (user_id, role_id)
select v.uid, r.id from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'administrator'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'supervisor'),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'requester'),
  ('00000000-0000-0000-0000-000000000004'::uuid, 'requester')
) as v (uid, role_name) join public.roles r on r.name = v.role_name;
insert into public.teams (name) values ('Equipo X');
insert into public.buildings (name) values ('Edificio X');
insert into public.locations (building_id, name)
  select id, 'PB' from public.buildings where name = 'Edificio X';
insert into public.dependencies (name) values ('Dep X');
insert into public.categories (team_id, name)
  select id, 'Cat X' from public.teams where name = 'Equipo X';
insert into public.service_types (name) values ('ST X');
insert into public.priorities (name) values ('P X');
insert into public.channels (name) values ('CH X');
insert into public.requesters (full_name, dependency_id, user_id)
  select 'Solicitante Uno', d.id, '00000000-0000-0000-0000-000000000003'
  from public.dependencies d where d.name = 'Dep X';
insert into public.requesters (full_name, dependency_id, user_id)
  select 'Solicitante Dos', d.id, '00000000-0000-0000-0000-000000000004'
  from public.dependencies d where d.name = 'Dep X';
insert into public.supervisor_scopes (user_id, team_id)
  select '00000000-0000-0000-0000-000000000002', t.id
  from public.teams t where t.name = 'Equipo X';
insert into public.supervisor_scope_buildings (scope_id, building_id)
  select ss.id, b.id from public.supervisor_scopes ss, public.buildings b
  where ss.user_id = '00000000-0000-0000-0000-000000000002' and b.name = 'Edificio X';

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001"}', true);
select public.ticket_create(jsonb_build_object(
  'building_id', (select id from public.buildings where name = 'Edificio X'),
  'location_id', (select id from public.locations where name = 'PB'),
  'dependency_id', (select id from public.dependencies where name = 'Dep X'),
  'category_id', (select id from public.categories where name = 'Cat X'),
  'service_type_id', (select id from public.service_types where name = 'ST X'),
  'priority_id', (select id from public.priorities where name = 'P X'),
  'channel_id', (select id from public.channels where name = 'CH X'),
  'description', 'Uno',
  'requester_id', (select id from public.requesters where full_name = 'Solicitante Uno')));
select public.ticket_create(jsonb_build_object(
  'building_id', (select id from public.buildings where name = 'Edificio X'),
  'location_id', (select id from public.locations where name = 'PB'),
  'dependency_id', (select id from public.dependencies where name = 'Dep X'),
  'category_id', (select id from public.categories where name = 'Cat X'),
  'service_type_id', (select id from public.service_types where name = 'ST X'),
  'priority_id', (select id from public.priorities where name = 'P X'),
  'channel_id', (select id from public.channels where name = 'CH X'),
  'description', 'Dos',
  'requester_id', (select id from public.requesters where full_name = 'Solicitante Dos')));

-- El supervisor toma el primero (genera el evento 'taken').
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002"}', true);
select public.ticket_take((select id from public.tickets order by ticket_number limit 1));

-- Un comentario (evento NO visible al solicitante).
insert into public.ticket_events (ticket_id, cycle, type, payload)
select id, cycle, 'comment', '{"text":"interno"}'::jsonb
from public.tickets order by ticket_number limit 1;

-- Guarda el id del tiquet ajeno antes de cambiar de rol (bajo RLS no se vería).
select set_config(
  'test.other_ticket',
  (select id::text from public.tickets order by ticket_number desc limit 1),
  true);

-- A partir de aquí, como el rol `authenticated`.
reset role;
set local role authenticated;

-- El solicitante uno solo ve su tiquet.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000003"}', true);
select is((select count(*)::int from public.tickets), 1,
  'el solicitante solo ve su propio tiquet');
select is(
  public.can_see_ticket(current_setting('test.other_ticket')::uuid),
  false, 'no puede ver el tiquet de otro solicitante');

-- Catalogs legibles por autenticados.
select cmp_ok((select count(*)::int from public.teams), '>', 0,
  'los autenticados leen los catálogos');

-- Visibilidad al solicitante.
select cmp_ok(
  (select count(*)::int from public.v_ticket_events_requester where type = 'taken'),
  '>=', 1, 'el solicitante ve los eventos configurados (taken)');
select is(
  (select count(*)::int from public.v_ticket_events_requester where type = 'comment'),
  0, 'el solicitante no ve los comentarios internos');

-- Vista de indicadores.
select is(
  (select count(*)::int from public.v_ticket_metrics_base
   where id = (select id from public.tickets order by ticket_number limit 1)),
  1, 'la vista base de indicadores incluye el tiquet');

-- El rol anónimo no ve tiquets.
reset role;
set local role anon;
select set_config('request.jwt.claims', '{}', true);
select is((select count(*)::int from public.tickets), 0, 'el rol anónimo no ve tiquets');

reset role;

select * from finish();

rollback;
