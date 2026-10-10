begin;

set search_path = extensions, public;

select plan(32);

-- Aísla las pruebas de tiquets que hayan quedado de la app o de las pruebas E2E.
truncate table public.tickets cascade;

select has_table('public', 'ticket_pauses', 'existe public.ticket_pauses');
select has_table('public', 'ticket_pause_steps', 'existe public.ticket_pause_steps');
select has_table('public', 'ticket_claims', 'existe public.ticket_claims');
select has_table('public', 'ticket_links', 'existe public.ticket_links');
select is(
  (select relrowsecurity from pg_class where oid = 'public.ticket_pauses'::regclass),
  true, 'RLS activado en ticket_pauses');
select is(
  (select relrowsecurity from pg_class where oid = 'public.ticket_pause_steps'::regclass),
  true, 'RLS activado en ticket_pause_steps');
select is(
  (select relrowsecurity from pg_class where oid = 'public.ticket_claims'::regclass),
  true, 'RLS activado en ticket_claims');
select is(
  (select relrowsecurity from pg_class where oid = 'public.ticket_links'::regclass),
  true, 'RLS activado en ticket_links');

-- Fixtures.
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
insert into public.requesters (full_name, contact, dependency_id, user_id)
  select 'Solicitante Alfa', 'ext. 1', d.id, '00000000-0000-0000-0000-000000000004'
  from public.dependencies d where d.name = 'Dependencia Alfa';
insert into public.technicians (full_name, user_id, team_id)
  select 'Técnico Alfa', '00000000-0000-0000-0000-000000000003', t.id
  from public.teams t where t.name = 'Equipo Alfa';
insert into public.technician_categories (technician_id, category_id)
  select tech.id, c.id from public.technicians tech, public.categories c
  where tech.full_name = 'Técnico Alfa' and c.name = 'Categoría Alfa';
insert into public.supervisor_scopes (user_id, team_id)
  select '00000000-0000-0000-0000-000000000002', t.id
  from public.teams t where t.name = 'Equipo Alfa';
insert into public.supervisor_scope_buildings (scope_id, building_id)
  select ss.id, b.id from public.supervisor_scopes ss, public.buildings b
  where ss.user_id = '00000000-0000-0000-0000-000000000002' and b.name = 'Edificio A';
update public.instance_settings set validation_policy = 'supervisor';

-- Motivos.
insert into public.reasons (use, name) values ('pause', 'Motivo de prueba') returning id;
insert into public.reasons (use, name, parent_id)
  select 'pause', 'Submotivo prueba 2', id from public.reasons where name = 'Motivo de prueba';
insert into public.reasons (use, name, parent_id, active)
  select 'pause', 'Submotivo inactivo', id, false
  from public.reasons where name = 'Submotivo prueba 2';
insert into public.reasons (use, name, parent_id)
  select 'pause', 'Sub-submotivo', id
  from public.reasons where name = 'Submotivo prueba 2';
insert into public.reasons (use, name) values ('pause', 'Otro motivo');
insert into public.reasons (use, name, parent_id)
  select 'pause', 'Otro hijo', id from public.reasons where name = 'Otro motivo';
insert into public.reasons (use, name) values ('claim', 'Motivo reclamo');
insert into public.reasons (use, name) values ('claim_outcome', 'Resultado procedente');
insert into public.reasons (use, name) values ('recapture', 'Motivo recaptura');

-- Crea un tiquet y recórrelo hasta "atendido".
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001"}', true);
select public.ticket_create(jsonb_build_object(
  'building_id', (select id from public.buildings where name = 'Edificio A'),
  'location_id', (select id from public.locations where name = 'Nivel A'),
  'dependency_id', (select id from public.dependencies where name = 'Dependencia Alfa'),
  'category_id', (select id from public.categories where name = 'Categoría Alfa'),
  'service_type_id', (select id from public.service_types where name = 'Servicio Alfa'),
  'priority_id', (select id from public.priorities where name = 'Prioridad Alfa'),
  'channel_id', (select id from public.channels where name = 'Canal Alfa'),
  'description', 'Falla de iluminación',
  'requester_id', (select id from public.requesters where full_name = 'Solicitante Alfa')));

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002"}', true);
select public.ticket_take((select id from public.tickets order by ticket_number limit 1));
select public.ticket_assign_technician(
  (select id from public.tickets order by ticket_number limit 1),
  (select id from public.technicians where full_name = 'Técnico Alfa'));

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000003"}', true);
insert into public.evidence (ticket_id, cycle, type)
  select id, cycle, 'before' from public.tickets order by ticket_number limit 1;
select public.ticket_start((select id from public.tickets order by ticket_number limit 1));

-- Pausa, avance y reanudación.
select public.ticket_pause(
  (select id from public.tickets order by ticket_number limit 1),
  (select id from public.reasons where name = 'Motivo de prueba'), 'sin cable');
select is(
  (select status from public.tickets order by ticket_number limit 1),
  'paused'::public.ticket_status, 'el tiquet queda pausado');

select throws_ok(
  $$ select public.ticket_advance_pause(
       (select id from public.tickets order by ticket_number limit 1),
       (select id from public.reasons where name = 'Otro hijo')) $$,
  'P0001', null, 'no gestiona con un subestado de otro motivo');
select throws_ok(
  $$ select public.ticket_resume(
       (select id from public.tickets order by ticket_number limit 1),
       (select id from public.reasons where name = 'Otro hijo')) $$,
  'P0001', null, 'no reanuda con un subestado de otro motivo');
select throws_ok(
  $$ select public.ticket_resume(
       (select id from public.tickets order by ticket_number limit 1)) $$,
  '42883', null, 'reanudar exige un subestado');

select public.ticket_advance_pause(
  (select id from public.tickets order by ticket_number limit 1),
  (select id from public.reasons where name = 'Submotivo prueba 2'));
select is(
  (select r.name from public.ticket_pauses p join public.reasons r on r.id = p.reason_id
   where p.closed_at is null limit 1),
  'Submotivo prueba 2', 'avanza el subestado de la pausa');
select is(
  (select count(*)::int from public.ticket_pause_steps), 2, 'registra cada paso del subestado');

select throws_ok(
  $$ select public.ticket_advance_pause(
       (select id from public.tickets order by ticket_number limit 1),
       (select id from public.reasons where name = 'Submotivo inactivo')) $$,
  'P0001', null, 'no avanza a un subestado inactivo');
select throws_ok(
  $$ select public.ticket_advance_pause(
       (select id from public.tickets order by ticket_number limit 1),
       (select id from public.reasons where name = 'Motivo de prueba')) $$,
  'P0001', null, 'no avanza a un nodo que no es hijo directo');
select is(
  (select count(*)::int from public.ticket_pause_steps(
     (select id from public.tickets order by ticket_number limit 1))),
  2, 'la función expone los pasos de la pausa');

select public.ticket_resume(
  (select id from public.tickets order by ticket_number limit 1),
  (select id from public.reasons where name = 'Sub-submotivo'));
select is(
  (select status from public.tickets order by ticket_number limit 1),
  'in_progress'::public.ticket_status, 'al reanudar vuelve a en proceso');
select is(
  (select r.name from public.ticket_pauses p join public.reasons r on r.id = p.reason_id
   where p.closed_at is not null order by p.closed_at desc limit 1),
  'Sub-submotivo', 'guardar el subestado final de la pausa');
select throws_ok(
  $$ select public.ticket_resume(
       (select id from public.tickets order by ticket_number limit 1),
       (select id from public.reasons where name = 'Submotivo prueba 2')) $$,
  'P0001', null, 'no reanuda sin pausa abierta');
select throws_ok(
  $$ select public.ticket_pause(
       (select id from public.tickets order by ticket_number limit 1),
       (select id from public.reasons where name = 'Motivo reclamo')) $$,
  'P0001', null, 'no pausa con un motivo de otro uso');

-- Recaptura.
select public.ticket_recapture(
  (select id from public.tickets order by ticket_number limit 1),
  jsonb_build_object('description', 'Falla de iluminación en el pasillo'),
  (select id from public.reasons where name = 'Motivo recaptura'));
select is(
  (select description from public.tickets order by ticket_number limit 1),
  'Falla de iluminación en el pasillo', 'la recaptura actualiza la captura');
select is(
  (select count(*)::int from public.ticket_captures), 1, 'conserva la versión de la recaptura');

-- Atendido y reclamación procedente.
insert into public.evidence (ticket_id, cycle, type)
  select id, cycle, 'after' from public.tickets order by ticket_number limit 1;
select public.ticket_attend(
  (select id from public.tickets order by ticket_number limit 1), 'Cambio de luminaria',
  null, null, (select id from public.service_types where name = 'Servicio Alfa'));
select is(
  (select status from public.tickets order by ticket_number limit 1),
  'attended'::public.ticket_status, 'el tiquet queda atendido');

-- La reclamación exige evidencia `claim` del ciclo.
insert into public.evidence (ticket_id, cycle, type)
  select id, cycle, 'claim' from public.tickets order by ticket_number limit 1;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002"}', true);
select public.ticket_open_claim(
  (select id from public.tickets order by ticket_number limit 1),
  (select id from public.reasons where name = 'Motivo reclamo'), 'no funcionó');
select is(
  (select status from public.tickets order by ticket_number limit 1),
  'under_claim'::public.ticket_status, 'el tiquet queda en reclamación');

select public.ticket_resolve_claim(
  (select id from public.tickets order by ticket_number limit 1), 'upheld',
  (select id from public.reasons where name = 'Resultado procedente'), 'procede');
select is(
  (select status from public.tickets order by ticket_number limit 1),
  'assigned'::public.ticket_status, 'una reclamación procedente reabre');
select is(
  (select cycle from public.tickets order by ticket_number limit 1),
  2, 'la reapertura inicia un ciclo nuevo');

-- Segundo tiquet: marcar duplicado y reactivar.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001"}', true);
select public.ticket_create(jsonb_build_object(
  'building_id', (select id from public.buildings where name = 'Edificio A'),
  'location_id', (select id from public.locations where name = 'Nivel A'),
  'dependency_id', (select id from public.dependencies where name = 'Dependencia Alfa'),
  'category_id', (select id from public.categories where name = 'Categoría Alfa'),
  'service_type_id', (select id from public.service_types where name = 'Servicio Alfa'),
  'priority_id', (select id from public.priorities where name = 'Prioridad Alfa'),
  'channel_id', (select id from public.channels where name = 'Canal Alfa'),
  'description', 'Otra falla',
  'requester_id', (select id from public.requesters where full_name = 'Solicitante Alfa')));

select public.ticket_mark_duplicate(
  (select id from public.tickets order by ticket_number desc limit 1),
  (select id from public.tickets order by ticket_number limit 1));
select is(
  (select status from public.tickets order by ticket_number desc limit 1),
  'duplicate'::public.ticket_status, 'marca el duplicado');
select is(
  (select count(*)::int from public.ticket_links where link_type = 'duplicate_of'),
  1, 'enlaza el duplicado con el original');

select public.ticket_reactivate(
  (select id from public.tickets order by ticket_number desc limit 1),
  (select id from public.reasons limit 1));
select is(
  (select status from public.tickets order by ticket_number desc limit 1),
  'registered'::public.ticket_status, 'reactivar devuelve al estado previo al descarte');
select throws_ok(
  $$ select public.ticket_reactivate(
       (select id from public.tickets order by ticket_number desc limit 1),
       (select id from public.reasons limit 1)) $$,
  'P0001', null, 'no reactiva un tiquet que no está descartado');

-- Tercer tiquet: reclamación improcedente cierra.
select public.ticket_create(jsonb_build_object(
  'building_id', (select id from public.buildings where name = 'Edificio A'),
  'location_id', (select id from public.locations where name = 'Nivel A'),
  'dependency_id', (select id from public.dependencies where name = 'Dependencia Alfa'),
  'category_id', (select id from public.categories where name = 'Categoría Alfa'),
  'service_type_id', (select id from public.service_types where name = 'Servicio Alfa'),
  'priority_id', (select id from public.priorities where name = 'Prioridad Alfa'),
  'channel_id', (select id from public.channels where name = 'Canal Alfa'),
  'description', 'Tercera',
  'requester_id', (select id from public.requesters where full_name = 'Solicitante Alfa')));
update public.tickets set status = 'attended'
  where id = (select id from public.tickets order by ticket_number desc limit 1);
insert into public.evidence (ticket_id, cycle, type)
  select id, cycle, 'claim' from public.tickets order by ticket_number desc limit 1;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002"}', true);
select public.ticket_open_claim(
  (select id from public.tickets order by ticket_number desc limit 1),
  (select id from public.reasons where name = 'Motivo reclamo'), 'no procede');
select public.ticket_resolve_claim(
  (select id from public.tickets order by ticket_number desc limit 1), 'dismissed',
  null, 'improcedente');
select is(
  (select status from public.tickets order by ticket_number desc limit 1),
  'closed'::public.ticket_status, 'una reclamación improcedente cierra el tiquet');

select * from finish();

rollback;
