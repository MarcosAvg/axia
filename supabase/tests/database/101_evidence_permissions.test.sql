begin;

set search_path = extensions, public;

select plan(4);

-- Aísla la prueba de los tiquets de la semilla.
truncate table public.tickets cascade;

insert into auth.users (id, email, raw_user_meta_data)
select v.id, v.email, jsonb_build_object('full_name', v.full_name)
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'admin@ev2.test', 'Admin'),
  ('00000000-0000-0000-0000-000000000004'::uuid, 'tec@ev2.test', 'Técnico')
) as v (id, email, full_name);

insert into public.user_roles (user_id, role_id)
select v.uid, r.id
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'administrator'),
  ('00000000-0000-0000-0000-000000000004'::uuid, 'technician')
) as v (uid, role_name)
join public.roles r on r.name = v.role_name;

insert into public.teams (name) values ('Equipo Alfa');
insert into public.buildings (name) values ('Edificio A');
insert into public.locations (building_id, name)
  select id, 'Nivel A' from public.buildings where name = 'Edificio A';
insert into public.dependencies (name) values ('Dependencia Alfa');
insert into public.categories (team_id, name)
  select id, 'Categoría Alfa' from public.teams where name = 'Equipo Alfa';
insert into public.service_types (name) values ('Servicio Alfa');
insert into public.priorities (name) values ('Prioridad Alfa');
insert into public.channels (name) values ('Canal Alfa');
insert into public.requesters (full_name, contact, dependency_id)
  select 'Solicitante Alfa', 'ext. 1', d.id
  from public.dependencies d where d.name = 'Dependencia Alfa';
insert into public.technicians (full_name, user_id, team_id)
  select 'Técnico Alfa', '00000000-0000-0000-0000-000000000004', t.id
  from public.teams t where t.name = 'Equipo Alfa';

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001"}', true);

select public.ticket_create(jsonb_build_object(
  'building_id', (select id from public.buildings where name = 'Edificio A'),
  'location_id', (select id from public.locations where name = 'Nivel A'),
  'dependency_id', (select id from public.dependencies where name = 'Dependencia Alfa'),
  'category_id', (select id from public.categories where name = 'Categoría Alfa'),
  'service_type_id', (select id from public.service_types where name = 'Servicio Alfa'),
  'priority_id', (select id from public.priorities where name = 'Prioridad Alfa'),
  'channel_id', (select id from public.channels where name = 'Canal Alfa'),
  'description', 'Prueba de permisos de evidencia',
  'requester_id', (select id from public.requesters where full_name = 'Solicitante Alfa')));

-- El técnico participa (puede ver el tiquet) y el tiquet está en proceso.
insert into public.ticket_participants (
  ticket_id, cycle, technician_id, participation_type, category_id, started_at)
select t.id, t.cycle, te.id, 'leader', t.category_id, now()
from public.tickets t
join public.technicians te on te.user_id = '00000000-0000-0000-0000-000000000004';
update public.tickets set status = 'in_progress';

-- El técnico puede registrar avance (`during`), pero no evidencia libre (`other`).
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000004"}', true);
select lives_ok(
  $$ select public.evidence_add(
       (select id from public.tickets limit 1), 'during', 'avance.jpg') $$,
  'el técnico registra avance (during)');
select throws_ok(
  $$ select public.evidence_add(
       (select id from public.tickets limit 1), 'other', 'libre.jpg') $$,
  '42501', null, 'el técnico no agrega evidencia libre');

-- El administrador sí puede la evidencia libre.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001"}', true);
select lives_ok(
  $$ select public.evidence_add(
       (select id from public.tickets limit 1), 'other', 'libre.jpg') $$,
  'el administrador agrega evidencia libre');
select is(
  (select payload ->> 'note' from public.ticket_events
   where type = 'evidence_added'
   order by id limit 1),
  null, 'la nota de la evidencia es nula si no se indica');

select * from finish();

rollback;
