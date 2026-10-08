begin;

set search_path = extensions, public;

select plan(7);

truncate table public.tickets cascade;

insert into auth.users (id, email, raw_user_meta_data)
select v.id, v.email, jsonb_build_object('full_name', v.full_name)
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'admin@conv.test', 'Admin'),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'tecnico@conv.test', 'Técnico')
) as v (id, email, full_name);
insert into public.user_roles (user_id, role_id)
select v.uid, r.id
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'administrator'),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'technician')
) as v (uid, role_name)
join public.roles r on r.name = v.role_name;

insert into public.teams (name) values ('Conv T');
insert into public.buildings (name) values ('Edificio Conv');
insert into public.locations (building_id, name)
  select id, 'Piso C' from public.buildings where name = 'Edificio Conv';
insert into public.dependencies (name) values ('Dep Conv');
insert into public.categories (team_id, name)
  select id, 'Cat Conv' from public.teams where name = 'Conv T';
insert into public.service_types (name) values ('Serv Conv');
insert into public.priorities (name) values ('Prio Conv');
insert into public.channels (name) values ('Canal Conv');
insert into public.requesters (full_name, dependency_id)
  select 'Req Conv', d.id from public.dependencies d where d.name = 'Dep Conv';

insert into public.tickets (
  team_id, building_id, location_id, dependency_id, category_id,
  service_type_id, priority_id, channel_id, description, requester_id,
  requester_name)
select t.id, b.id, l.id, d.id, c.id, s.id, p.id, ch.id, 'Conv tiquet', r.id, 'Req Conv'
from public.teams t, public.buildings b, public.locations l,
  public.dependencies d, public.categories c, public.service_types s,
  public.priorities p, public.channels ch, public.requesters r
where t.name = 'Conv T' and b.name = 'Edificio Conv' and l.name = 'Piso C'
  and d.name = 'Dep Conv' and c.name = 'Cat Conv' and s.name = 'Serv Conv'
  and p.name = 'Prio Conv' and ch.name = 'Canal Conv' and r.full_name = 'Req Conv';

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001"}', true);

select lives_ok(
  $$ select public.integration_task_create(
       (select id from public.tickets where description = 'Conv tiquet'),
       'conv system', 'Actualizar en el origen') $$,
  'crea la tarea de convivencia');
select is(
  (select status from public.integration_tasks),
  'open', 'la tarea queda abierta');
select lives_ok(
  $$ select public.integration_task_resolve(
       (select id from public.integration_tasks limit 1)) $$,
  'marca la tarea como hecha');
select is(
  (select status from public.integration_tasks),
  'done', 'la tarea queda hecha');

-- Estado externo.
select public.import_system('conv system');
insert into public.ticket_external_refs (ticket_id, system, external_id)
  select id, 'conv system', 'EXT-9' from public.tickets where description = 'Conv tiquet';
select lives_ok(
  $$ select public.external_status_set('conv system', 'EXT-9', 'PENDIENTE') $$,
  'registra el estado externo');
select is(
  (select external_status from public.ticket_external_refs where external_id = 'EXT-9'),
  'PENDIENTE', 'el estado externo queda guardado');

-- Autoridad por defecto.
select is(
  (select authority from public.external_systems where name = 'conv system'),
  'source', 'la autoridad por defecto es el origen');

select * from finish();

rollback;
