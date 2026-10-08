-- Fase 5B-0, tramo 5: la identidad incluye la zona horaria de la instancia.
-- La interfaz muestra las fechas en esa zona, no en la del dispositivo.

create or replace function public.me()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'user_id', auth.uid(),
    'profile', (
      select jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'phone', p.phone,
        'active', p.active
      )
      from public.profiles p
      where p.id = auth.uid()
    ),
    'roles', coalesce((
      select jsonb_agg(distinct r.name)
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id and r.active
      where ur.user_id = auth.uid()
    ), '[]'::jsonb),
    'permissions', coalesce((
      select jsonb_agg(distinct jsonb_build_object(
        'permission', rp.permission_id,
        'scope', rp.scope
      ))
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id and r.active
      join public.role_permissions rp on rp.role_id = ur.role_id
      where ur.user_id = auth.uid()
    ), '[]'::jsonb),
    'timezone', coalesce(
      (select timezone from public.instance_settings limit 1), 'UTC')
  );
$$;
comment on function public.me() is
  'Identidad del usuario en sesión: perfil, roles, permisos y zona horaria de la instancia.';
revoke execute on function public.me() from public, anon;
grant execute on function public.me() to authenticated;
