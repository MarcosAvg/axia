begin;

set search_path = extensions, public;

select plan(18);

-- Fixtures (como postgres; las políticas se prueban después como `authenticated`).
insert into auth.users (id, email, raw_user_meta_data)
select v.id, v.email, jsonb_build_object('full_name', v.full_name)
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'admin@prueba.test', 'Admin'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'supervisor@prueba.test', 'Supervisor')
) as v (id, email, full_name);

insert into public.user_roles (user_id, role_id)
select v.uid, r.id
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'administrator'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'supervisor')
) as v (uid, role_name)
join public.roles r on r.name = v.role_name;

insert into public.teams (name) values ('Equipo Base'), ('Equipo Otro');
insert into public.categories (team_id, name)
  select id, 'Categoría Base' from public.teams where name = 'Equipo Base';
insert into public.technicians (full_name, team_id)
  select 'Técnico Base', id from public.teams where name = 'Equipo Base';

-- 1. El administrador escribe.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001"}', true);

select lives_ok(
  $$ insert into public.teams (name) values ('Equipo Admin') $$,
  'el admin crea un equipo');
select lives_ok(
  $$ insert into public.roles (name, label) values ('rol-admin', 'Rol Admin') $$,
  'el admin crea un rol');
select lives_ok(
  $$ insert into public.reasons (use, name) values ('pause', 'Motivo Admin') $$,
  'el admin crea un motivo');
select lives_ok(
  $$ insert into public.supervisor_scopes (user_id, team_id)
     select '00000000-0000-0000-0000-000000000002', id from public.teams where name = 'Equipo Base' $$,
  'el admin crea un ámbito de supervisor');
select lives_ok(
  $$ insert into public.technician_categories (technician_id, category_id)
     select t.id, c.id from public.technicians t, public.categories c
     where t.full_name = 'Técnico Base' and c.name = 'Categoría Base' $$,
  'el admin designa un técnico a una categoría');
select lives_ok(
  $$ update public.profiles set full_name = 'Supervisor Editado'
     where id = '00000000-0000-0000-0000-000000000002' $$,
  'el admin edita un perfil');
select is(
  (select full_name from public.profiles where id = '00000000-0000-0000-0000-000000000002'),
  'Supervisor Editado', 'el perfil quedó editado');
select lives_ok(
  $$ update public.instance_settings set validation_policy = 'requester' $$,
  'el admin edita la configuración de la instancia');
select lives_ok(
  $$ update public.teams set active = false where name = 'Equipo Admin' $$,
  'el admin desactiva un equipo (no lo borra)');
select is(
  (select active from public.teams where name = 'Equipo Admin'), false,
  'el equipo queda inactivo');

-- 2. Un no-admin (supervisor) no puede escribir.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002"}', true);

select throws_ok(
  $$ insert into public.teams (name) values ('Equipo Supervisor') $$,
  '42501', null, 'un no-admin no crea equipos');
select throws_ok(
  $$ insert into public.roles (name, label) values ('rol-nope', 'Nope') $$,
  '42501', null, 'un no-admin no crea roles');
select throws_ok(
  $$ insert into public.supervisor_scopes (user_id, team_id)
     select '00000000-0000-0000-0000-000000000002', id from public.teams where name = 'Equipo Otro' $$,
  '42501', null, 'un no-admin no crea ámbitos');

update public.teams set name = 'hack' where name = 'Equipo Admin';
select is(
  (select name from public.teams where name = 'Equipo Admin'), 'Equipo Admin',
  'un no-admin no renombra un equipo');

update public.instance_settings set validation_policy = 'supervisor';
select is(
  (select validation_policy from public.instance_settings limit 1), 'requester',
  'un no-admin no edita la configuración');

delete from public.user_roles where user_id = '00000000-0000-0000-0000-000000000002';
select is(
  (select count(*)::int from public.user_roles
   where user_id = '00000000-0000-0000-0000-000000000002'), 1,
  'un no-admin no quita roles');

-- 3. El administrador sí quita roles (tabla de relación).
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001"}', true);
select lives_ok(
  $$ delete from public.user_roles
     where user_id = '00000000-0000-0000-0000-000000000002' $$,
  'el admin quita un rol');
select is(
  (select count(*)::int from public.user_roles
   where user_id = '00000000-0000-0000-0000-000000000002'), 0,
  'el rol quedó retirado');

reset role;

select * from finish();

rollback;
