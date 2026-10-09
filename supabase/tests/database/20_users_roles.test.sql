begin;

set search_path = extensions, public;

select plan(28);

-- Tablas del tramo 2.
select has_table('public', 'profiles', 'existe public.profiles');
select has_table('public', 'permissions', 'existe public.permissions');
select has_table('public', 'roles', 'existe public.roles');
select has_table('public', 'role_permissions', 'existe public.role_permissions');
select has_table('public', 'user_roles', 'existe public.user_roles');
select has_table('public', 'supervisor_scopes', 'existe public.supervisor_scopes');
select has_table('public', 'supervisor_scope_buildings', 'existe public.supervisor_scope_buildings');
select has_table('public', 'requesters', 'existe public.requesters');
select has_table('public', 'technicians', 'existe public.technicians');
select has_table('public', 'technician_categories', 'existe public.technician_categories');

-- RLS activado.
select is(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  true, 'RLS activado en profiles');
select is(
  (select relrowsecurity from pg_class where oid = 'public.permissions'::regclass),
  true, 'RLS activado en permissions');
select is(
  (select relrowsecurity from pg_class where oid = 'public.roles'::regclass),
  true, 'RLS activado en roles');
select is(
  (select relrowsecurity from pg_class where oid = 'public.role_permissions'::regclass),
  true, 'RLS activado en role_permissions');
select is(
  (select relrowsecurity from pg_class where oid = 'public.user_roles'::regclass),
  true, 'RLS activado en user_roles');
select is(
  (select relrowsecurity from pg_class where oid = 'public.supervisor_scopes'::regclass),
  true, 'RLS activado en supervisor_scopes');
select is(
  (select relrowsecurity from pg_class where oid = 'public.supervisor_scope_buildings'::regclass),
  true, 'RLS activado en supervisor_scope_buildings');
select is(
  (select relrowsecurity from pg_class where oid = 'public.requesters'::regclass),
  true, 'RLS activado en requesters');
select is(
  (select relrowsecurity from pg_class where oid = 'public.technicians'::regclass),
  true, 'RLS activado en technicians');
select is(
  (select relrowsecurity from pg_class where oid = 'public.technician_categories'::regclass),
  true, 'RLS activado en technician_categories');

-- Semillas.
select cmp_ok((select count(*)::int from public.permissions), '>=', 30,
  'se sembraron los permisos del sistema');
select is(
  (select count(*) from public.role_permissions rp
     join public.roles r on r.id = rp.role_id where r.name = 'administrator'),
  (select count(*) from public.permissions),
  'el administrador tiene todos los permisos');

-- Restricciones.
select throws_ok(
  $$ insert into public.role_permissions (role_id, permission_id, scope)
     select r.id, p.id, 'bad'
     from public.roles r, public.permissions p
     where r.name = 'requester' and p.id = 'ticket.reactivate' $$,
  '22P02', null, 'rechaza un ámbito inválido');
select throws_ok(
  $$ insert into public.role_permissions (role_id, permission_id, scope)
     select r.id, p.id, 'own'
     from public.roles r, public.permissions p
     where r.name = 'requester' and p.id = 'ticket.create' $$,
  '23505', null, 'no repite un permiso en el mismo rol');
select throws_ok(
  $$ insert into public.roles (name, label) values ('administrator', 'Otro') $$,
  '23505', null, 'no repite el nombre de rol');

-- Solicitantes y técnicos pueden existir sin cuenta.
select lives_ok(
  $$ insert into public.requesters (full_name, contact) values ('Solicitante Alfa', 'ext. 100') $$,
  'inserta un solicitante sin cuenta');
select lives_ok(
  $$ insert into public.teams (name) values ('Equipo Alfa') $$,
  'inserta un equipo');
select lives_ok(
  $$ insert into public.technicians (full_name, team_id)
     select 'Técnico Alfa', id from public.teams where name = 'Equipo Alfa' $$,
  'inserta un técnico sin cuenta');

select * from finish();

rollback;
