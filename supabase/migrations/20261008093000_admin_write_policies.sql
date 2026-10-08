-- Fase 3B, tramo 1: políticas RLS de escritura para la administración.
-- Diseño: docs/especificacion-negocio.md §6 y §10; ajusta el alcance del ADR 0015 (ADR 0018).
-- Regla: los catálogos se desactivan (`active = false`), nunca se borran; solo las tablas de
-- relación admiten DELETE.

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('teams', 'catalog.manage', false),
      ('buildings', 'catalog.manage', false),
      ('locations', 'catalog.manage', false),
      ('dependencies', 'catalog.manage', false),
      ('categories', 'catalog.manage', false),
      ('subcategories', 'catalog.manage', false),
      ('problems', 'catalog.manage', false),
      ('service_types', 'catalog.manage', false),
      ('priorities', 'catalog.manage', false),
      ('channels', 'catalog.manage', false),
      ('reasons', 'catalog.manage', false),
      ('requesters', 'catalog.manage', false),
      ('technicians', 'catalog.manage', false),
      ('roles', 'role.manage', false),
      ('role_permissions', 'role.manage', true),
      ('user_roles', 'role.manage', true),
      ('supervisor_scopes', 'assignment.manage', true),
      ('supervisor_scope_buildings', 'assignment.manage', true),
      ('technician_categories', 'assignment.manage', true)
    ) as v (t, permission, allow_delete)
  loop
    execute format(
      'create policy %I on public.%I for insert to authenticated
         with check (public.has_permission((select auth.uid()), %L))',
      r.t || '_admin_insert', r.t, r.permission);
    execute format(
      'create policy %I on public.%I for update to authenticated
         using (public.has_permission((select auth.uid()), %L))
         with check (public.has_permission((select auth.uid()), %L))',
      r.t || '_admin_update', r.t, r.permission, r.permission);
    if r.allow_delete then
      execute format(
        'create policy %I on public.%I for delete to authenticated
           using (public.has_permission((select auth.uid()), %L))',
        r.t || '_admin_delete', r.t, r.permission);
    end if;
  end loop;
end;
$$;

-- Perfiles: un administrador puede activar/desactivar y editar cualquier perfil.
create policy profiles_admin_update on public.profiles
  for update to authenticated
  using (public.has_permission((select auth.uid()), 'user.manage'))
  with check (public.has_permission((select auth.uid()), 'user.manage'));

-- Configuración de la instancia: la edita quien administra catálogos.
create policy instance_settings_admin_update on public.instance_settings
  for update to authenticated
  using (public.has_permission((select auth.uid()), 'catalog.manage'))
  with check (public.has_permission((select auth.uid()), 'catalog.manage'));
