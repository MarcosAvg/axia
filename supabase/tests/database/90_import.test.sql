begin;

set search_path = extensions, public;

select plan(14);

insert into auth.users (id, email, raw_user_meta_data)
select v.id, v.email, jsonb_build_object('full_name', v.full_name)
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'admin@imp.test', 'Admin'),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'tecnico@imp.test', 'Técnico')
) as v (id, email, full_name);

insert into public.user_roles (user_id, role_id)
select v.uid, r.id
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'administrator'),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'technician')
) as v (uid, role_name)
join public.roles r on r.name = v.role_name;

insert into public.teams (name) values ('Imp T');
insert into public.buildings (name) values ('Edificio Imp');
insert into public.locations (building_id, name)
  select id, 'Piso I' from public.buildings where name = 'Edificio Imp';
insert into public.dependencies (name) values ('Dep Imp');
insert into public.categories (team_id, name)
  select id, 'Cat Imp' from public.teams where name = 'Imp T';
insert into public.service_types (name) values ('Serv Imp');
insert into public.priorities (name) values ('Prio Imp');
insert into public.channels (name) values ('Canal Imp');
insert into public.requesters (full_name, dependency_id)
  select 'Req Imp', d.id from public.dependencies d where d.name = 'Dep Imp';

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001"}', true);

select lives_ok(
  $$ select public.import_system('sistema prueba') $$,
  'registra el sistema de origen');
select lives_ok(
  $$ select public.import_status_set('sistema prueba', 'EN PROCESO', 'in_progress') $$,
  'define el mapeo de estatus');
select is(
  public.import_status_get('sistema prueba', 'en proceso'),
  'in_progress'::public.ticket_status, 'resuelve el estatus sin distinguir mayúsculas');
select lives_ok(
  $$ select public.import_alias_set(
       'buildings', 'Edif. X',
       (select id from public.buildings where name = 'Edificio Imp')) $$,
  'crea un alias de catálogo');
select is(
  public.import_alias_get('buildings', 'edif. x'),
  (select id from public.buildings where name = 'Edificio Imp'),
  'resuelve el alias por catálogo');

-- Flujo de lote y upsert.
create temporary table imp_ids as
  select public.import_batch_start('sistema prueba', 'dry_run') as batch_id;
select lives_ok(
  $$ select public.import_record_add(
       (select batch_id from imp_ids), 1, '{"ID":5000}'::jsonb, 'inserted') $$,
  'guarda una fila del lote');

select lives_ok(
  $$ select public.import_ticket_upsert(
       'sistema prueba', 'EXT-1',
       jsonb_build_object(
         'ticket_number', '5000',
         'building_id', (select id from public.buildings where name = 'Edificio Imp'),
         'location_id', (select id from public.locations where name = 'Piso I'),
         'dependency_id', (select id from public.dependencies where name = 'Dep Imp'),
         'category_id', (select id from public.categories where name = 'Cat Imp'),
         'service_type_id', (select id from public.service_types where name = 'Serv Imp'),
         'priority_id', (select id from public.priorities where name = 'Prio Imp'),
         'channel_id', (select id from public.channels where name = 'Canal Imp'),
         'description', 'Importado',
         'requester_id', (select id from public.requesters where full_name = 'Req Imp'),
         'requester_name', 'Req Imp',
         'status', 'in_progress',
         'reported_at', '2026-06-17 14:14:00+00')) $$,
  'importa un tiquet');

select is(
  (select ticket_number from public.tickets where description = 'Importado'),
  5000::bigint, 'conserva el número original de la fuente');
select is(
  (select count(*)::int from public.ticket_external_refs
    where system = 'sistema prueba' and external_id = 'EXT-1'),
  1, 'registra la referencia externa');
select is(
  (select source from public.ticket_events e
    join public.tickets t on t.id = e.ticket_id
    where t.description = 'Importado' and e.type = 'imported'),
  'import'::public.event_source, 'escribe el evento de importación');
select cmp_ok(
  (select last_value from public.tickets_number_seq),
  '>=', 5000::bigint, 'la secuencia continúa después del mayor importado');

-- Idempotencia: reimportar no duplica.
select is(
  public.import_ticket_upsert(
    'sistema prueba', 'EXT-1', jsonb_build_object('description', 'Importado')),
  (select id from public.tickets where description = 'Importado'),
  'reimportar devuelve el mismo tiquet');
select is(
  (select count(*)::int from public.tickets where description = 'Importado'),
  1, 'no duplica el tiquet');

-- Un usuario sin permiso no importa.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000003"}', true);
select throws_ok(
  $$ select public.import_ticket_upsert('sistema prueba', 'EXT-2', '{}'::jsonb) $$,
  '42501', null, 'un usuario sin permiso no importa');

select * from finish();

rollback;
