-- Fase 2, tramo 1: identidad de la cuenta.
-- Crea el perfil automáticamente al dar de alta una cuenta, expone la identidad del usuario
-- (perfil, roles y permisos) en una sola llamada y permite editar el perfil propio.
-- Diseño: docs/dominio.md §2 y §13; ADR 0016.

-- 1. Perfil automático al crear la cuenta en Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      new.id::text
    ),
    nullif(btrim(new.raw_user_meta_data ->> 'phone'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
comment on function public.handle_new_user() is
  'Crea el perfil al dar de alta una cuenta (auth.users); idempotente.';
revoke execute on function public.handle_new_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Identidad del cliente: perfil, roles y permisos en una sola llamada.
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
    ), '[]'::jsonb)
  );
$$;
comment on function public.me() is
  'Identidad del usuario en sesión: perfil, roles y permisos (con su ámbito).';
revoke execute on function public.me() from public;
grant execute on function public.me() to authenticated;

-- 3. Edición del perfil propio (solo nombre y teléfono del usuario en sesión).
create or replace function public.profile_update(p_full_name text, p_phone text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := nullif(btrim(coalesce(p_full_name, '')), '');
begin
  if auth.uid() is null then
    raise exception 'Se requiere sesión' using errcode = '42501';
  end if;
  if v_name is null then
    raise exception 'El nombre no puede estar vacío' using errcode = '22023';
  end if;
  update public.profiles
    set full_name = v_name,
        phone = nullif(btrim(coalesce(p_phone, '')), '')
    where id = auth.uid();
  if not found then
    raise exception 'Perfil no encontrado' using errcode = 'P0002';
  end if;
end;
$$;
comment on function public.profile_update(text, text) is
  'Actualiza el nombre y el teléfono del perfil propio; no permite editar a otros.';
revoke execute on function public.profile_update(text, text) from public;
grant execute on function public.profile_update(text, text) to authenticated;

-- 4. Endurecimiento de permisos de ejecución.
-- Los privilegios por defecto de Supabase conceden EXECUTE a `anon`; las funciones del núcleo
-- solo las ejecuta `authenticated`. Se corrige para las funciones ya creadas y para las futuras.
revoke execute on function public.handle_new_user() from anon, public;

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname <> 'handle_new_user'
  loop
    execute format('revoke execute on function %s from anon, public', f.signature);
    execute format('grant execute on function %s to authenticated', f.signature);
  end loop;
end;
$$;

alter default privileges in schema public revoke execute on functions from anon;
alter default privileges in schema public revoke execute on functions from public;
