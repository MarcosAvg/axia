begin;

set search_path = extensions, public;

select plan(24);

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

-- Motivos.
insert into public.reasons (use, name) values ('pause', 'Falta de material') returning id;
insert into public.reasons (use, name, parent_id)
  select 'pause', 'En cotización', id from public.reasons where name = 'Falta de material';
insert into public.reasons (use, name) values ('claim', 'Trabajo incompleto');
insert into public.reasons (use, name) values ('claim_outcome', 'Procedente');
insert into public.reasons (use, name) values ('recapture', 'Descripción insuficiente');

-- Crea un tiquet y recórrelo hasta "atendido".
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001"}', true);
select public.ticket_create(jsonb_build_object(
  'building_id', (select id from public.buildings where name = 'Edificio A'),
  'location_id', (select id from public.locations where name = 'Planta baja'),
  'dependency_id', (select id from public.dependencies where name = 'Sistemas'),
  'category_id', (select id from public.categories where name = 'Eléctrico'),
  'service_type_id', (select id from public.service_types where name = 'Correctivo'),
  'priority_id', (select id from public.priorities where name = 'Media'),
  'channel_id', (select id from public.channels where name = 'Web'),
  'description', 'Falla de iluminación',
  'requester_id', (select id from public.requesters where full_name = 'Ana Pérez')));

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002"}', true);
select public.ticket_take((select id from public.tickets order by ticket_number limit 1));
select public.ticket_assign_technician(
  (select id from public.tickets order by ticket_number limit 1),
  (select id from public.technicians where full_name = 'Luis Gómez'));

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000003"}', true);
insert into public.evidence (ticket_id, cycle, type)
  select id, cycle, 'before' from public.tickets order by ticket_number limit 1;
select public.ticket_start((select id from public.tickets order by ticket_number limit 1));

-- Pausa, avance y reanudación.
select public.ticket_pause(
  (select id from public.tickets order by ticket_number limit 1),
  (select id from public.reasons where name = 'Falta de material'), 'sin cable');
select is(
  (select status from public.tickets order by ticket_number limit 1),
  'paused'::public.ticket_status, 'el tiquet queda pausado');

select public.ticket_advance_pause(
  (select id from public.tickets order by ticket_number limit 1),
  (select id from public.reasons where name = 'En cotización'));
select is(
  (select r.name from public.ticket_pauses p join public.reasons r on r.id = p.reason_id
   where p.closed_at is null limit 1),
  'En cotización', 'avanza el subestado de la pausa');
select is(
  (select count(*)::int from public.ticket_pause_steps), 2, 'registra cada paso del subestado');

select public.ticket_resume((select id from public.tickets order by ticket_number limit 1));
select is(
  (select status from public.tickets order by ticket_number limit 1),
  'in_progress'::public.ticket_status, 'al reanudar vuelve a en proceso');
select throws_ok(
  $$ select public.ticket_resume((select id from public.tickets order by ticket_number limit 1)) $$,
  'P0001', null, 'no reanuda sin pausa abierta');

-- Recaptura.
select public.ticket_recapture(
  (select id from public.tickets order by ticket_number limit 1),
  jsonb_build_object('description', 'Falla de iluminación en el pasillo'),
  (select id from public.reasons where name = 'Descripción insuficiente'));
select is(
  (select description from public.tickets order by ticket_number limit 1),
  'Falla de iluminación en el pasillo', 'la recaptura actualiza la captura');
select is(
  (select count(*)::int from public.ticket_captures), 1, 'conserva la versión de la recaptura');

-- Atendido y reclamación procedente.
insert into public.evidence (ticket_id, cycle, type)
  select id, cycle, 'after' from public.tickets order by ticket_number limit 1;
select public.ticket_attend(
  (select id from public.tickets order by ticket_number limit 1), 'Cambio de luminaria');
select is(
  (select status from public.tickets order by ticket_number limit 1),
  'attended'::public.ticket_status, 'el tiquet queda atendido');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002"}', true);
select public.ticket_open_claim(
  (select id from public.tickets order by ticket_number limit 1),
  (select id from public.reasons where name = 'Trabajo incompleto'), 'no funcionó');
select is(
  (select status from public.tickets order by ticket_number limit 1),
  'under_claim'::public.ticket_status, 'el tiquet queda en reclamación');

select public.ticket_resolve_claim(
  (select id from public.tickets order by ticket_number limit 1), 'upheld',
  (select id from public.reasons where name = 'Procedente'), 'procede');
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
  'location_id', (select id from public.locations where name = 'Planta baja'),
  'dependency_id', (select id from public.dependencies where name = 'Sistemas'),
  'category_id', (select id from public.categories where name = 'Eléctrico'),
  'service_type_id', (select id from public.service_types where name = 'Correctivo'),
  'priority_id', (select id from public.priorities where name = 'Media'),
  'channel_id', (select id from public.channels where name = 'Web'),
  'description', 'Otra falla',
  'requester_id', (select id from public.requesters where full_name = 'Ana Pérez')));

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
  'location_id', (select id from public.locations where name = 'Planta baja'),
  'dependency_id', (select id from public.dependencies where name = 'Sistemas'),
  'category_id', (select id from public.categories where name = 'Eléctrico'),
  'service_type_id', (select id from public.service_types where name = 'Correctivo'),
  'priority_id', (select id from public.priorities where name = 'Media'),
  'channel_id', (select id from public.channels where name = 'Web'),
  'description', 'Tercera',
  'requester_id', (select id from public.requesters where full_name = 'Ana Pérez')));
update public.tickets set status = 'attended'
  where id = (select id from public.tickets order by ticket_number desc limit 1);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002"}', true);
select public.ticket_open_claim(
  (select id from public.tickets order by ticket_number desc limit 1),
  (select id from public.reasons where name = 'Trabajo incompleto'), 'no procede');
select public.ticket_resolve_claim(
  (select id from public.tickets order by ticket_number desc limit 1), 'dismissed',
  null, 'improcedente');
select is(
  (select status from public.tickets order by ticket_number desc limit 1),
  'closed'::public.ticket_status, 'una reclamación improcedente cierra el tiquet');

select * from finish();

rollback;
