begin;

set search_path = extensions, public;

select plan(5);

-- Aísla la prueba de los tiquets de la semilla.
truncate table public.tickets cascade;

insert into auth.users (id, email, raw_user_meta_data)
  values ('00000000-0000-0000-0000-000000000001', 'admin@ev.test',
          jsonb_build_object('full_name', 'Admin'));
insert into public.user_roles (user_id, role_id)
  select '00000000-0000-0000-0000-000000000001', r.id
  from public.roles r where r.name = 'administrator';

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
insert into public.reasons (use, name) values ('claim', 'Motivo reclamo');

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
  'description', 'Prueba de evidencia por estado',
  'requester_id', (select id from public.requesters where full_name = 'Solicitante Alfa')));

-- En `registered` no se admite la evidencia "antes", sí la de solicitud.
select throws_ok(
  $$ select public.evidence_add(
       (select id from public.tickets limit 1), 'before', 'x.jpg') $$,
  'P0001', null, 'no permite la evidencia "antes" en registrado');
select lives_ok(
  $$ select public.evidence_add(
       (select id from public.tickets limit 1), 'request', 'req.jpg') $$,
  'permite la evidencia de solicitud al registrar');

-- En `assigned` se admite "antes", no "después".
update public.tickets set status = 'assigned';
select lives_ok(
  $$ select public.evidence_add(
       (select id from public.tickets limit 1), 'before', 'before.jpg') $$,
  'permite la evidencia "antes" cuando está asignado');
select throws_ok(
  $$ select public.evidence_add(
       (select id from public.tickets limit 1), 'after', 'after.jpg') $$,
  'P0001', null, 'no permite la evidencia "después" antes de trabajar');

-- En `attended`, reclamar exige evidencia `claim`.
update public.tickets set status = 'attended';
select throws_ok(
  $$ select public.ticket_open_claim(
       (select id from public.tickets limit 1),
       (select id from public.reasons where name = 'Motivo reclamo'), 'no procede') $$,
  'P0001', 'Falta la evidencia de la reclamación',
  'la reclamación exige la evidencia del ciclo');

select * from finish();

rollback;
