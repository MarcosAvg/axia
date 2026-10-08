begin;

set search_path = extensions, public;

select plan(20);

-- Tablas del tramo 4.
select has_table('public', 'ticket_offers', 'existe public.ticket_offers');
select has_table('public', 'ticket_duplicate_candidates', 'existe public.ticket_duplicate_candidates');
select has_table('public', 'ticket_validations', 'existe public.ticket_validations');
select is(
  (select relrowsecurity from pg_class where oid = 'public.ticket_offers'::regclass),
  true, 'RLS activado en ticket_offers');
select is(
  (select relrowsecurity from pg_class where oid = 'public.ticket_duplicate_candidates'::regclass),
  true, 'RLS activado en ticket_duplicate_candidates');
select is(
  (select relrowsecurity from pg_class where oid = 'public.ticket_validations'::regclass),
  true, 'RLS activado en ticket_validations');

-- Cuentas y datos de prueba.
-- El perfil lo crea el disparador on_auth_user_created (Fase 2) desde los metadatos.
insert into auth.users (id, email, raw_user_meta_data)
select v.id, v.email, jsonb_build_object('full_name', v.full_name)
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'admin@prueba.test', 'Admin'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'supervisor@prueba.test', 'Supervisor'),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'tecnico@prueba.test', 'Técnico'),
  ('00000000-0000-0000-0000-000000000004'::uuid, 'solicitante@prueba.test', 'Solicitante')
) as v (id, email, full_name);

insert into public.user_roles (user_id, role_id)
select v.uid, r.id
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'administrator'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'supervisor'),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'technician'),
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
insert into public.subcategories (category_id, name)
  select id, 'Contacto' from public.categories where name = 'Eléctrico';
insert into public.problems (subcategory_id, name)
  select id, 'Chispa' from public.subcategories where name = 'Contacto';
insert into public.service_types (name) values ('Correctivo');
insert into public.priorities (name) values ('Media');
insert into public.priorities (name) values ('Alta');
insert into public.channels (name) values ('Web');

insert into public.requesters (full_name, contact, dependency_id, user_id)
  select 'Ana Pérez', 'ext. 1', d.id, '00000000-0000-0000-0000-000000000004'
  from public.dependencies d where d.name = 'Sistemas';

insert into public.technicians (full_name, user_id, team_id)
  select 'Luis Gómez', '00000000-0000-0000-0000-000000000003', t.id
  from public.teams t where t.name = 'Mantenimiento';
insert into public.technician_categories (technician_id, category_id)
  select tech.id, c.id
  from public.technicians tech, public.categories c
  where tech.full_name = 'Luis Gómez' and c.name = 'Eléctrico';

insert into public.supervisor_scopes (user_id, team_id)
  select '00000000-0000-0000-0000-000000000002', t.id
  from public.teams t where t.name = 'Mantenimiento';
insert into public.supervisor_scope_buildings (scope_id, building_id)
  select ss.id, b.id
  from public.supervisor_scopes ss, public.buildings b
  where ss.user_id = '00000000-0000-0000-0000-000000000002' and b.name = 'Edificio A';

-- La validación será solo del supervisor para este escenario.
update public.instance_settings set validation_policy = 'supervisor';

-- Registrar (como administrador, a nombre del solicitante).
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001"}', true);

select ok(
  (select public.ticket_create(jsonb_build_object(
     'building_id', (select id from public.buildings where name = 'Edificio A'),
     'location_id', (select id from public.locations where name = 'Planta baja'),
     'dependency_id', (select id from public.dependencies where name = 'Sistemas'),
     'category_id', (select id from public.categories where name = 'Eléctrico'),
     'subcategory_id', (select id from public.subcategories where name = 'Contacto'),
     'problem_id', (select id from public.problems where name = 'Chispa'),
     'service_type_id', (select id from public.service_types where name = 'Correctivo'),
     'priority_id', (select id from public.priorities where name = 'Media'),
     'channel_id', (select id from public.channels where name = 'Web'),
     'description', 'No enciende la luz',
     'requester_id', (select id from public.requesters where full_name = 'Ana Pérez')
   )) is not null),
  'registra un tiquet a nombre del solicitante');

select is(
  (select count(*)::int from public.ticket_offers
   where supervisor_user_id = '00000000-0000-0000-0000-000000000002' and status = 'offered'),
  1, 'ofrece el tiquet al supervisor candidato');
select is(
  (select possible_duplicate from public.tickets order by ticket_number limit 1),
  false, 'no marca posible duplicado sin coincidencias');

-- Tomar como supervisor.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002"}', true);
select public.ticket_take((select id from public.tickets order by ticket_number limit 1));
select is(
  (select status from public.tickets order by ticket_number limit 1),
  'with_supervisor'::public.ticket_status, 'el tiquet pasa a con supervisor');

-- Asignar técnico.
select public.ticket_assign_technician(
  (select id from public.tickets order by ticket_number limit 1),
  (select id from public.technicians where full_name = 'Luis Gómez'));
select is(
  (select status from public.tickets order by ticket_number limit 1),
  'assigned'::public.ticket_status, 'el tiquet pasa a asignado');
select is(
  (select count(*)::int from public.ticket_participants where participation_type = 'leader'),
  1, 'registra al técnico designado como líder');

-- Iniciar exige evidencia "before".
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000003"}', true);
select throws_ok(
  $$ select public.ticket_start((select id from public.tickets order by ticket_number limit 1)) $$,
  'P0001', null, 'no inicia sin evidencia "before"');

insert into public.evidence (ticket_id, cycle, type)
  select id, cycle, 'before' from public.tickets order by ticket_number limit 1;

select public.ticket_start((select id from public.tickets order by ticket_number limit 1));
select is(
  (select status from public.tickets order by ticket_number limit 1),
  'in_progress'::public.ticket_status, 'el tiquet pasa a en proceso');

select throws_ok(
  $$ select public.ticket_attend(
       (select id from public.tickets order by ticket_number limit 1), 'Trabajo') $$,
  'P0001', null, 'no marca atendido sin evidencia "after"');

insert into public.evidence (ticket_id, cycle, type)
  select id, cycle, 'after' from public.tickets order by ticket_number limit 1;

select public.ticket_attend(
  (select id from public.tickets order by ticket_number limit 1), 'Se cambió el apagador');
select is(
  (select status from public.tickets order by ticket_number limit 1),
  'attended'::public.ticket_status, 'el tiquet pasa a atendido');

-- Validar como supervisor.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002"}', true);
select public.ticket_validate((select id from public.tickets order by ticket_number limit 1));
select is(
  (select status from public.tickets order by ticket_number limit 1),
  'closed'::public.ticket_status, 'el tiquet queda cerrado');

-- El solicitante no puede rechazar.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000004"}', true);
select throws_ok(
  $$ select public.ticket_reject(
       (select id from public.tickets order by ticket_number limit 1),
       (select id from public.reasons limit 1)) $$,
  '42501', null, 'el solicitante no puede rechazar');

-- Idempotencia del comentario.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002"}', true);
select public.ticket_comment(
  (select id from public.tickets order by ticket_number limit 1), 'nota',
  true, '00000000-0000-0000-0000-0000000000cd');
select public.ticket_comment(
  (select id from public.tickets order by ticket_number limit 1), 'nota',
  true, '00000000-0000-0000-0000-0000000000cd');
select is(
  (select count(*)::int from public.ticket_events
   where client_request_id = '00000000-0000-0000-0000-0000000000cd'),
  1, 'la repetición de una petición no duplica el evento');

-- Ajuste de prioridad.
select public.ticket_change_priority(
  (select id from public.tickets order by ticket_number limit 1),
  (select id from public.priorities where name = 'Alta'));
select is(
  (select p.name from public.tickets t join public.priorities p on p.id = t.priority_id
   order by t.ticket_number limit 1),
  'Alta', 'ajusta la prioridad con evento');

select * from finish();

rollback;
