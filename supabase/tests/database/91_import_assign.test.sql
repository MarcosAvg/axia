begin;

set search_path = extensions, public;

select plan(5);

insert into auth.users (id, email, raw_user_meta_data)
select v.id, v.email, jsonb_build_object('full_name', v.full_name)
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'admin@imp2.test', 'Admin'),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'tecnico@imp2.test', 'Técnico')
) as v (id, email, full_name);

insert into public.user_roles (user_id, role_id)
select v.uid, r.id
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'administrator'),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'technician')
) as v (uid, role_name)
join public.roles r on r.name = v.role_name;

insert into public.teams (name) values ('Imp2 T');
insert into public.buildings (name) values ('Edificio Imp2');
insert into public.locations (building_id, name)
  select id, 'Piso J' from public.buildings where name = 'Edificio Imp2';
insert into public.dependencies (name) values ('Dep Imp2');
insert into public.categories (team_id, name)
  select id, 'Cat Imp2' from public.teams where name = 'Imp2 T';
insert into public.service_types (name) values ('Serv Imp2');
insert into public.priorities (name) values ('Prio Imp2');
insert into public.channels (name) values ('Canal Imp2');
insert into public.requesters (full_name, dependency_id)
  select 'Req Imp2', d.id from public.dependencies d where d.name = 'Dep Imp2';
insert into public.technicians (full_name, team_id)
  select 'Tec Imp2', t.id from public.teams t where t.name = 'Imp2 T';
insert into public.technician_categories (technician_id, category_id)
  select te.id, c.id from public.technicians te, public.categories c
  where te.full_name = 'Tec Imp2' and c.name = 'Cat Imp2';

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001"}', true);

select public.import_ticket_upsert(
  'sistema prueba 2', 'EXT-A',
  jsonb_build_object(
    'building_id', (select id from public.buildings where name = 'Edificio Imp2'),
    'location_id', (select id from public.locations where name = 'Piso J'),
    'dependency_id', (select id from public.dependencies where name = 'Dep Imp2'),
    'category_id', (select id from public.categories where name = 'Cat Imp2'),
    'service_type_id', (select id from public.service_types where name = 'Serv Imp2'),
    'priority_id', (select id from public.priorities where name = 'Prio Imp2'),
    'channel_id', (select id from public.channels where name = 'Canal Imp2'),
    'description', 'Importado asignado',
    'requester_id', (select id from public.requesters where full_name = 'Req Imp2'),
    'requester_name', 'Req Imp2',
    'reported_at', '2026-06-17 14:14:00+00'));

select public.import_ticket_assign(
  (select id from public.tickets where description = 'Importado asignado'),
  (select id from public.technicians where full_name = 'Tec Imp2'),
  '2026-06-17 16:00:00+00');

select is(
  (select count(*)::int from public.ticket_assignments
    where ticket_id = (select id from public.tickets where description = 'Importado asignado')
      and stage = 'technician'),
  1, 'asigna el técnico');
select is(
  (select participation_type from public.ticket_participants
    where ticket_id = (select id from public.tickets where description = 'Importado asignado')),
  'leader'::public.participation_type, 'el técnico designado queda como líder');

select public.import_ticket_assign(
  (select id from public.tickets where description = 'Importado asignado'),
  (select id from public.technicians where full_name = 'Tec Imp2'));
select is(
  (select count(*)::int from public.ticket_assignments
    where ticket_id = (select id from public.tickets where description = 'Importado asignado')
      and stage = 'technician'),
  1, 'reasignar al mismo técnico no duplica');
select is(
  (select count(*)::int from public.ticket_participants
    where ticket_id = (select id from public.tickets where description = 'Importado asignado')),
  1, 'no duplica la participación');

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000003"}', true);
select throws_ok(
  $$ select public.import_ticket_assign(
       (select id from public.tickets where description = 'Importado asignado'),
       (select id from public.technicians where full_name = 'Tec Imp2')) $$,
  '42501', null, 'un usuario sin permiso no asigna');

select * from finish();

rollback;
