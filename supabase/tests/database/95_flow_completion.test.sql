begin;

set search_path = extensions, public;

select plan(34);

-- 1. Evidencia en Storage.
select is(
  (select count(*)::int from storage.buckets where id = 'evidence'), 1,
  'existe el bucket privado evidence');
select is(
  (select count(*)::int from pg_policies
   where schemaname = 'storage' and tablename = 'objects' and policyname = 'evidence_select'),
  1, 'existe la política de lectura de evidencia');
select is(
  (select count(*)::int from pg_policies
   where schemaname = 'storage' and tablename = 'objects' and policyname = 'evidence_insert'),
  1, 'existe la política de subida de evidencia');

-- 2. Cuentas y catálogos de prueba.
insert into auth.users (id, email, raw_user_meta_data)
select v.id, v.email, jsonb_build_object('full_name', v.full_name)
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'admin@prueba.test', 'Admin'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'supervisor1@prueba.test', 'Supervisor Uno'),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'supervisor2@prueba.test', 'Supervisor Dos'),
  ('00000000-0000-0000-0000-000000000004'::uuid, 'tecnico1@prueba.test', 'Técnico Uno'),
  ('00000000-0000-0000-0000-000000000005'::uuid, 'tecnico2@prueba.test', 'Técnico Dos')
) as v (id, email, full_name);

insert into public.user_roles (user_id, role_id)
select v.uid, r.id
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'administrator'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'supervisor'),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'supervisor'),
  ('00000000-0000-0000-0000-000000000004'::uuid, 'technician'),
  ('00000000-0000-0000-0000-000000000005'::uuid, 'technician')
) as v (uid, role_name)
join public.roles r on r.name = v.role_name;

insert into public.teams (name) values ('Equipo Alfa'), ('Equipo Beta');
insert into public.buildings (name) values ('Edificio A');
insert into public.locations (building_id, name)
  select id, 'Nivel A' from public.buildings where name = 'Edificio A';
insert into public.dependencies (name) values ('Dependencia Alfa');
insert into public.categories (team_id, name)
  select id, 'Categoría Alfa' from public.teams where name = 'Equipo Alfa';
insert into public.categories (team_id, name)
  select id, 'Categoría Gamma' from public.teams where name = 'Equipo Beta';
insert into public.subcategories (category_id, name)
  select id, 'Subcategoría Alfa' from public.categories where name = 'Categoría Alfa';
insert into public.problems (subcategory_id, name)
  select id, 'Chispa' from public.subcategories where name = 'Subcategoría Alfa';
insert into public.service_types (name) values ('Servicio Alfa');
insert into public.priorities (name) values ('Prioridad Alfa');
insert into public.channels (name) values ('Canal Alfa');

insert into public.requesters (full_name, contact, dependency_id)
  select 'Solicitante Alfa', 'ext. 1', d.id
  from public.dependencies d where d.name = 'Dependencia Alfa';

insert into public.technicians (full_name, user_id, team_id)
  select 'Técnico Alfa', '00000000-0000-0000-0000-000000000004', t.id
  from public.teams t where t.name = 'Equipo Alfa';
insert into public.technicians (full_name, user_id, team_id)
  select 'Técnico Beta', '00000000-0000-0000-0000-000000000005', t.id
  from public.teams t where t.name = 'Equipo Alfa';

insert into public.supervisor_scopes (user_id, team_id)
  select '00000000-0000-0000-0000-000000000002', t.id
  from public.teams t where t.name = 'Equipo Alfa';
insert into public.supervisor_scope_buildings (scope_id, building_id)
  select ss.id, b.id from public.supervisor_scopes ss, public.buildings b
  where ss.user_id = '00000000-0000-0000-0000-000000000002' and b.name = 'Edificio A';
insert into public.supervisor_scopes (user_id, team_id)
  select '00000000-0000-0000-0000-000000000003', t.id
  from public.teams t where t.name = 'Equipo Beta';
insert into public.supervisor_scope_buildings (scope_id, building_id)
  select ss.id, b.id from public.supervisor_scopes ss, public.buildings b
  where ss.user_id = '00000000-0000-0000-0000-000000000003' and b.name = 'Edificio A';

-- 3. Reasignación de supervisor (RN-06).
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001"}', true);

select public.ticket_create(jsonb_build_object(
  'building_id', (select id from public.buildings where name = 'Edificio A'),
  'location_id', (select id from public.locations where name = 'Nivel A'),
  'dependency_id', (select id from public.dependencies where name = 'Dependencia Alfa'),
  'category_id', (select id from public.categories where name = 'Categoría Alfa'),
  'subcategory_id', (select id from public.subcategories where name = 'Subcategoría Alfa'),
  'problem_id', (select id from public.problems where name = 'Chispa'),
  'service_type_id', (select id from public.service_types where name = 'Servicio Alfa'),
  'priority_id', (select id from public.priorities where name = 'Prioridad Alfa'),
  'channel_id', (select id from public.channels where name = 'Canal Alfa'),
  'description', 'No enciende la luz',
  'requester_id', (select id from public.requesters where full_name = 'Solicitante Alfa')));

select is(
  (select count(*)::int from public.ticket_offers
   where supervisor_user_id = '00000000-0000-0000-0000-000000000002' and status = 'offered'),
  1, 'el tiquet se ofrece al supervisor del equipo');

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002"}', true);
select public.ticket_take((select id from public.tickets where description = 'No enciende la luz'));
select is(
  (select status from public.tickets where description = 'No enciende la luz'),
  'with_supervisor'::public.ticket_status, 'el supervisor toma el tiquet');

select public.ticket_assign_supervisor(
  (select id from public.tickets where description = 'No enciende la luz'),
  (select id from public.reasons where use = 'supervisor_reassignment' limit 1),
  null,
  (select id from public.teams where name = 'Equipo Beta'),
  'Equipo incorrecto');
select is(
  (select status from public.tickets where description = 'No enciende la luz'),
  'registered'::public.ticket_status, 'al cambiar de equipo vuelve a registrado');
select is(
  (select t.name from public.tickets tk join public.teams t on t.id = tk.team_id
   where tk.description = 'No enciende la luz'),
  'Equipo Beta', 'el tiquet queda en el equipo destino');
select is(
  (select count(*)::int from public.ticket_offers o
   join public.tickets tk on tk.id = o.ticket_id
   where tk.description = 'No enciende la luz'
     and o.supervisor_user_id = '00000000-0000-0000-0000-000000000003' and o.status = 'offered'),
  1, 'se re-rutea al supervisor del equipo destino');
select is(
  (select count(*)::int from public.ticket_events e
   join public.tickets tk on tk.id = e.ticket_id
   where tk.description = 'No enciende la luz' and e.type = 'reassigned_supervisor'),
  1, 'la reasignación queda en el historial');
select is(
  (select count(*)::int from public.time_spans s
   join public.tickets tk on tk.id = s.ticket_id
   where tk.description = 'No enciende la luz' and s.kind = 'reassignment'),
  1, 'la reasignación genera su tramo de tiempo');

-- Estado inválido: no se reasigna un tiquet registrado (sin responsable).
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001"}', true);
select throws_ok(
  $$ select public.ticket_assign_supervisor(
       (select id from public.tickets where description = 'No enciende la luz'),
       (select id from public.reasons where use = 'supervisor_reassignment' limit 1),
       null,
       (select id from public.teams where name = 'Equipo Beta')) $$,
  'P0001', null, 'no se reasigna un tiquet registrado');

-- Segundo tiquet: reasignación a un supervisor concreto.
select public.ticket_create(jsonb_build_object(
  'building_id', (select id from public.buildings where name = 'Edificio A'),
  'location_id', (select id from public.locations where name = 'Nivel A'),
  'dependency_id', (select id from public.dependencies where name = 'Dependencia Alfa'),
  'category_id', (select id from public.categories where name = 'Categoría Alfa'),
  'service_type_id', (select id from public.service_types where name = 'Servicio Alfa'),
  'priority_id', (select id from public.priorities where name = 'Prioridad Alfa'),
  'channel_id', (select id from public.channels where name = 'Canal Alfa'),
  'description', 'Fuga de agua',
  'requester_id', (select id from public.requesters where full_name = 'Solicitante Alfa')));

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002"}', true);
select public.ticket_take((select id from public.tickets where description = 'Fuga de agua'));
select is(
  (select status from public.tickets where description = 'Fuga de agua'),
  'with_supervisor'::public.ticket_status, 'el segundo tiquet queda con supervisor');

select public.ticket_assign_supervisor(
  (select id from public.tickets where description = 'Fuga de agua'),
  (select id from public.reasons where use = 'supervisor_reassignment' limit 1),
  '00000000-0000-0000-0000-000000000003');
select is(
  (select count(*)::int from public.ticket_assignments a
   join public.tickets tk on tk.id = a.ticket_id
   where tk.description = 'Fuga de agua' and a.stage = 'supervisor'
     and a.ended_at is null and a.assignee_user_id = '00000000-0000-0000-0000-000000000003'),
  1, 'queda asignado al supervisor concreto');
select is(
  (select count(*)::int from public.ticket_assignments a
   join public.tickets tk on tk.id = a.ticket_id
   where tk.description = 'Fuga de agua' and a.stage = 'supervisor' and a.ended_at is not null),
  1, 'se cierra la asignación anterior');

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000003"}', true);
select throws_ok(
  $$ select public.ticket_assign_supervisor(
       (select id from public.tickets where description = 'Fuga de agua'),
       (select id from public.reasons where use = 'rejection' limit 1),
       '00000000-0000-0000-0000-000000000002') $$,
  '22023', null, 'rechaza un motivo que no es de reasignación de supervisor');

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002"}', true);
select throws_ok(
  $$ select public.ticket_assign_supervisor(
       (select id from public.tickets where description = 'Fuga de agua'),
       (select id from public.reasons where use = 'supervisor_reassignment' limit 1),
       '00000000-0000-0000-0000-000000000002') $$,
  '42501', null, 'solo quien tiene el tiquet puede reasignarlo');

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000004"}', true);
select throws_ok(
  $$ select public.ticket_assign_supervisor(
       (select id from public.tickets where description = 'Fuga de agua'),
       (select id from public.reasons where use = 'supervisor_reassignment' limit 1),
       '00000000-0000-0000-0000-000000000002') $$,
  '42501', null, 'el técnico no reasigna supervisores');

-- 4. Apoyo auxiliar (RN-07).
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000003"}', true);
select public.ticket_add_auxiliary(
  (select id from public.tickets where description = 'Fuga de agua'),
  (select id from public.technicians where full_name = 'Técnico Alfa'),
  (select id from public.reasons where use = 'auxiliary_support' limit 1));
select is(
  (select count(*)::int from public.ticket_participants p
   join public.tickets tk on tk.id = p.ticket_id
   where tk.description = 'Fuga de agua' and p.participation_type = 'auxiliary'),
  1, 'registra al técnico como apoyo auxiliar');
select is(
  (select count(*)::int from public.ticket_events e
   join public.tickets tk on tk.id = e.ticket_id
   where tk.description = 'Fuga de agua' and e.type = 'auxiliary_added'),
  1, 'el apoyo auxiliar queda en el historial');

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000004"}', true);
select is(
  public.can_see_ticket((select id from public.tickets where description = 'Fuga de agua')),
  true, 'el auxiliar puede ver el tiquet');

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000003"}', true);
select throws_ok(
  $$ select public.ticket_add_auxiliary(
       (select id from public.tickets where description = 'Fuga de agua'),
       (select id from public.technicians where full_name = 'Técnico Alfa'),
       (select id from public.reasons where use = 'auxiliary_support' limit 1)) $$,
  '23505', null, 'no repite al mismo auxiliar');
select throws_ok(
  $$ select public.ticket_add_auxiliary(
       (select id from public.tickets where description = 'Fuga de agua'),
       (select id from public.technicians where full_name = 'Técnico Beta'),
       (select id from public.reasons where use = 'rejection' limit 1)) $$,
  '22023', null, 'rechaza un motivo que no es de apoyo auxiliar');

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000004"}', true);
select throws_ok(
  $$ select public.ticket_add_auxiliary(
       (select id from public.tickets where description = 'Fuga de agua'),
       (select id from public.technicians where full_name = 'Técnico Beta'),
       (select id from public.reasons where use = 'auxiliary_support' limit 1)) $$,
  '42501', null, 'el técnico no agrega auxiliares');

-- 5. Pre-chequeo de duplicados (RN-29).
update public.instance_settings set duplicate_shown_fields = '{folio}';
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001"}', true);
select ok(
  jsonb_array_length(public.ticket_check_duplicates(jsonb_build_object(
    'building_id', (select id from public.buildings where name = 'Edificio A'),
    'category_id', (select id from public.categories where name = 'Categoría Alfa'),
    'description', 'No enciende la luz'))) >= 1,
  'encuentra al menos un posible duplicado');
select ok(
  (public.ticket_check_duplicates(jsonb_build_object(
    'building_id', (select id from public.buildings where name = 'Edificio A'),
    'category_id', (select id from public.categories where name = 'Categoría Alfa'),
    'description', 'No enciende la luz')) -> 0) ? 'folio',
  'el candidato incluye el folio');
select ok(
  not ((public.ticket_check_duplicates(jsonb_build_object(
    'building_id', (select id from public.buildings where name = 'Edificio A'),
    'category_id', (select id from public.categories where name = 'Categoría Alfa'),
    'description', 'No enciende la luz')) -> 0) ? 'status'),
  'no expone campos fuera de la configuración');

-- 6. Evidencia.
select ok(
  public.evidence_add(
    (select id from public.tickets where description = 'No enciende la luz'),
    'request',
    'tickets/00000000-0000-0000-0000-0000000000e1/1/foto.jpg',
    'image/jpeg', 1024) is not null,
  'registra una evidencia');
select is(
  (select count(*)::int from public.evidence ev
   join public.tickets tk on tk.id = ev.ticket_id
   where tk.description = 'No enciende la luz' and ev.type = 'request'),
  1, 'la evidencia queda guardada');
select is(
  (select count(*)::int from public.ticket_events e
   join public.tickets tk on tk.id = e.ticket_id
   where tk.description = 'No enciende la luz' and e.type = 'evidence_added'),
  1, 'la evidencia genera su evento');
select is(
  (select ev.event_id is not null from public.evidence ev
   join public.tickets tk on tk.id = ev.ticket_id
   where tk.description = 'No enciende la luz' and ev.type = 'request'),
  true, 'la evidencia queda ligada a su evento');

select set_config('test.ev1', (
  public.evidence_add(
    (select id from public.tickets where description = 'No enciende la luz'),
    'other',
    'tickets/00000000-0000-0000-0000-0000000000e2/1/nota.pdf',
    'application/pdf', 1024, now(), '00000000-0000-0000-0000-0000000000ce')::text), true);
select set_config('test.ev2', (
  public.evidence_add(
    (select id from public.tickets where description = 'No enciende la luz'),
    'other',
    'tickets/00000000-0000-0000-0000-0000000000e2/1/nota.pdf',
    'application/pdf', 1024, now(), '00000000-0000-0000-0000-0000000000ce')::text), true);
select is(
  current_setting('test.ev2')::uuid, current_setting('test.ev1')::uuid,
  'la repetición devuelve la misma evidencia (idempotente)');
select is(
  (select count(*)::int from public.evidence
   where client_request_id = '00000000-0000-0000-0000-0000000000ce'),
  1, 'la repetición no duplica la evidencia');
select throws_ok(
  $$ select public.evidence_add(
       (select id from public.tickets where description = 'No enciende la luz'),
       'other', '   ') $$,
  '22023', null, 'rechaza una ruta vacía');
select throws_ok(
  $$ select public.evidence_add('00000000-0000-0000-0000-0000000000ff', 'other', 'x.jpg') $$,
  'P0001', null, 'rechaza un tiquet inexistente');

select * from finish();

rollback;
