begin;

set search_path = extensions, public;

select plan(25);

-- 1. El disparador crea el perfil al dar de alta la cuenta.
select lives_ok(
  $$ insert into auth.users (id, email, raw_user_meta_data)
     values ('00000000-0000-0000-0000-0000000000e1', 'nueva@prueba.test',
             '{"full_name":"Persona Nueva","phone":"ext. 555"}'::jsonb) $$,
  'el alta de una cuenta con metadatos no falla');
select is(
  (select full_name from public.profiles where id = '00000000-0000-0000-0000-0000000000e1'),
  'Persona Nueva', 'el disparador copia el nombre de los metadatos');
select is(
  (select phone from public.profiles where id = '00000000-0000-0000-0000-0000000000e1'),
  'ext. 555', 'el disparador copia el teléfono de los metadatos');

select lives_ok(
  $$ insert into auth.users (id, email)
     values ('00000000-0000-0000-0000-0000000000e2', 'respaldo@prueba.test') $$,
  'el alta sin metadatos no falla');
select is(
  (select full_name from public.profiles where id = '00000000-0000-0000-0000-0000000000e2'),
  'respaldo', 'sin nombre usa el prefijo del correo');

select lives_ok(
  $$ insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000e5') $$,
  'el alta sin correo ni metadatos no falla');
select is(
  (select full_name from public.profiles where id = '00000000-0000-0000-0000-0000000000e5'),
  '00000000-0000-0000-0000-0000000000e5', 'sin correo ni nombre usa el identificador');

-- 2. Identidad: me() devuelve perfil, roles y permisos del usuario en sesión.
insert into auth.users (id, email, raw_user_meta_data)
  values ('00000000-0000-0000-0000-0000000000e3', 'supervisor2@prueba.test',
          '{"full_name":"Super Visor"}'::jsonb);
insert into public.user_roles (user_id, role_id)
  select '00000000-0000-0000-0000-0000000000e3', id from public.roles where name = 'supervisor';
insert into auth.users (id, email, raw_user_meta_data)
  values ('00000000-0000-0000-0000-0000000000e4', 'solicitante2@prueba.test',
          '{"full_name":"Soli Citante"}'::jsonb);
insert into public.user_roles (user_id, role_id)
  select '00000000-0000-0000-0000-0000000000e4', id from public.roles where name = 'requester';

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3"}', true);

select is(public.me() ->> 'user_id', '00000000-0000-0000-0000-0000000000e3',
  'me() devuelve el usuario en sesión');
select is(public.me() -> 'profile' ->> 'full_name', 'Super Visor',
  'me() devuelve el perfil');
select is(jsonb_typeof(public.me() -> 'roles'), 'array',
  'me() devuelve los roles como arreglo');
select ok((public.me() -> 'roles') ? 'supervisor',
  'me() incluye el rol del usuario');
select ok(
  (public.me() -> 'permissions') @> '[{"permission":"ticket.validate","scope":"team"}]'::jsonb,
  'me() incluye un permiso con su ámbito');
select ok(not ((public.me() -> 'roles') ? 'administrator'),
  'me() no inventa roles que el usuario no tiene');

-- 3. Edición del perfil propio: solo el del usuario en sesión.
select lives_ok($$ select public.profile_update('Super Visor Dos', 'ext. 9') $$,
  'el usuario edita su propio perfil');
select is(
  (select full_name from public.profiles where id = '00000000-0000-0000-0000-0000000000e3'),
  'Super Visor Dos', 'cambia el nombre del perfil propio');
select is(
  (select phone from public.profiles where id = '00000000-0000-0000-0000-0000000000e3'),
  'ext. 9', 'cambia el teléfono del perfil propio');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e4"}', true);
select lives_ok($$ select public.profile_update('Soli Citante Dos') $$,
  'otro usuario edita su propio perfil');
select is(
  (select full_name from public.profiles where id = '00000000-0000-0000-0000-0000000000e4'),
  'Soli Citante Dos', 'cambia el perfil del segundo usuario');
select is(
  (select full_name from public.profiles where id = '00000000-0000-0000-0000-0000000000e3'),
  'Super Visor Dos', 'no altera el perfil de otro usuario');
select throws_ok($$ select public.profile_update('   ') $$, '22023', null,
  'rechaza un nombre vacío');

-- 4. Permisos de ejecución de las funciones nuevas.
reset role;
select is(has_function_privilege('anon', 'public.me()', 'execute'), false,
  'el rol anónimo no puede ejecutar me()');
select is(has_function_privilege('authenticated', 'public.profile_update(text, text)', 'execute'),
  true, 'el rol autenticado puede ejecutar profile_update()');
select is(has_function_privilege('anon', 'public.profile_update(text, text)', 'execute'), false,
  'el rol anónimo no puede ejecutar profile_update()');
select is(has_function_privilege('anon', 'public.handle_new_user()', 'execute'), false,
  'el rol anónimo no puede ejecutar handle_new_user()');

-- 5. El rol anónimo no ve perfiles (RLS de lectura solo para autenticados).
set local role anon;
select is((select count(*)::int from public.profiles), 0,
  'el rol anónimo no ve perfiles');
reset role;

select * from finish();

rollback;
