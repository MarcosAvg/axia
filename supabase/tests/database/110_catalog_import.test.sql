begin;

set search_path = extensions, public;

select plan(18);

-- Fixtures (como postgres; los permisos se prueban después como `authenticated`).
insert into auth.users (id, email, raw_user_meta_data)
select v.id, v.email, jsonb_build_object('full_name', v.full_name)
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'admin@catimp.test', 'Admin'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'sup@catimp.test', 'Supervisor')
) as v (id, email, full_name);

insert into public.user_roles (user_id, role_id)
select v.uid, r.id
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'administrator'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'supervisor')
) as v (uid, role_name)
join public.roles r on r.name = v.role_name;

-- 1-3. Existen las tablas.
select has_table('public', 'catalog_import_specs', 'existe catalog_import_specs');
select has_table('public', 'catalog_import_runs', 'existe catalog_import_runs');
select has_table('public', 'catalog_import_rows', 'existe catalog_import_rows');

-- 4. RLS activado.
select is(
  (select relrowsecurity from pg_class where oid = 'public.catalog_import_runs'::regclass),
  true, 'RLS activado en catalog_import_runs');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001"}', true);

-- 5. Abre una carga.
select ok(
  (select public.catalog_import_start('commit', 'plantilla.xlsx') is not null),
  'el admin abre una carga de catálogos');
select set_config(
  'test.run_id',
  (select public.catalog_import_start('commit', 'plantilla.xlsx')::text),
  true);

-- 6. Inserta un equipo nuevo.
select is(
  (public.catalog_import_sheet(
     current_setting('test.run_id')::uuid,
     'teams',
     jsonb_build_array(jsonb_build_object('name', 'Equipo Imp', 'active', true))
   ))->>'inserted',
  '1', 'inserta un equipo nuevo');

-- 7. Reimportar actualiza, no duplica.
select is(
  (public.catalog_import_sheet(
     current_setting('test.run_id')::uuid,
     'teams',
     jsonb_build_array(jsonb_build_object('name', 'Equipo Imp', 'active', false))
   ))->>'updated',
  '1', 'reimportar actualiza el equipo');

select is(
  (select count(*)::int from public.teams where name = 'Equipo Imp'),
  1, 'el equipo no se duplica');
select is(
  (select active from public.teams where name = 'Equipo Imp'),
  false, 'el equipo quedó actualizado');

-- 8. Categoría con su equipo (relación resuelta por id).
select is(
  (public.catalog_import_sheet(
     current_setting('test.run_id')::uuid,
     'categories',
     jsonb_build_array(jsonb_build_object(
       'team_id', (select id from public.teams where name = 'Equipo Imp'),
       'name', 'Cat Imp',
       'active', true))
   ))->>'inserted',
  '1', 'inserta una categoría ligada a su equipo');

-- 9. Ubicación con su edificio.
select set_config(
  'test.building_id',
  (select id from public.buildings order by created_at limit 1)::text,
  true);
select is(
  (public.catalog_import_sheet(
     current_setting('test.run_id')::uuid,
     'locations',
     jsonb_build_array(jsonb_build_object(
       'building_id', current_setting('test.building_id')::uuid,
       'name', 'Nivel Imp',
       'active', true))
   ))->>'inserted',
  '1', 'inserta una ubicación ligada a su edificio');

-- 10. Una fila inválida se registra como error sin abortar la hoja.
select is(
  (public.catalog_import_sheet(
     current_setting('test.run_id')::uuid,
     'locations',
     jsonb_build_array(
       jsonb_build_object(
         'building_id', current_setting('test.building_id')::uuid,
         'name', 'Nivel Dos', 'active', true),
       jsonb_build_object(
         'building_id', 'no-es-uuid', 'name', 'Mala', 'active', true))
   ))->>'errors',
  '1', 'registra la fila inválida como error');
select is(
  (select count(*)::int from public.locations where name = 'Nivel Dos'),
  1, 'la fila válida sí se aplicó');

-- 11. Catálogo desconocido.
select throws_ok(
  $$ select public.catalog_import_sheet(
       current_setting('test.run_id')::uuid, 'inventado', '[]'::jsonb) $$,
  '22023', null, 'rechaza un catálogo desconocido');

-- 12. Cierra la carga.
select lives_ok(
  $$ select public.catalog_import_finish(
       current_setting('test.run_id')::uuid, 'completed', '{"ok":true}'::jsonb) $$,
  'el admin cierra la carga');

-- 13. Historial de filas.
select is(
  (select count(*)::int from public.catalog_import_rows where run_id = current_setting('test.run_id')::uuid),
  6, 'el historial guarda una fila por renglón procesado');

-- 14. Resumen.
select is(
  (select status from public.catalog_import_runs where id = current_setting('test.run_id')::uuid),
  'completed', 'la carga queda completada');

-- 15. Un no-admin no puede importar catálogos.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002"}', true);
select throws_ok(
  $$ select public.catalog_import_start('commit', 'x.xlsx') $$,
  '42501', null, 'un no-admin no importa catálogos');

reset role;

select * from finish();

rollback;
