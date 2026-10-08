-- Tramo 2 de la Fase 1: usuarios, perfiles, roles, permisos y ámbitos.
-- Diseño: docs/modelo-datos.md §3.2. Los roles y permisos son configurables (RN-26);
-- el conjunto de permisos es fijo y se siembra en seed.sql.

create type public.permission_scope as enum ('own', 'team', 'buildings', 'all');

-- Perfil 1:1 con la cuenta de Supabase Auth.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Perfil de cada cuenta (nombre visible, teléfono).';

-- Conjunto fijo de permisos del sistema.
create table public.permissions (
  id text primary key,
  description text not null,
  created_at timestamptz not null default now()
);
comment on table public.permissions is 'Permisos fijos del sistema (no configurables).';

-- Roles configurables.
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  label text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.roles is 'Roles configurables, armados con permisos y ámbito (RN-26).';

create table public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_id text not null references public.permissions (id),
  scope public.permission_scope not null,
  primary key (role_id, permission_id)
);
comment on table public.role_permissions is
  'Permiso (con su ámbito) asignado a un rol. Ámbitos: own, team, buildings, all.';

create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);
comment on table public.user_roles is 'Roles de cada cuenta (una cuenta puede tener varios).';

-- Ámbito de supervisores: un equipo (relajable a futuro) y varios edificios.
create table public.supervisor_scopes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  team_id uuid not null references public.teams (id),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, team_id)
);
comment on table public.supervisor_scopes is 'Ámbito de un supervisor: equipo y edificios (RN-04).';

create table public.supervisor_scope_buildings (
  scope_id uuid not null references public.supervisor_scopes (id) on delete cascade,
  building_id uuid not null references public.buildings (id),
  primary key (scope_id, building_id)
);

-- Catálogo de solicitantes (cuenta opcional) y de técnicos (cuenta opcional).
create table public.requesters (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  contact text,
  dependency_id uuid references public.dependencies (id),
  user_id uuid unique references auth.users (id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.requesters is
  'Solicitantes con vínculo opcional a una cuenta (modelo mixto).';

create table public.technicians (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  user_id uuid unique references auth.users (id) on delete set null,
  team_id uuid not null references public.teams (id),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.technicians is
  'Técnicos con vínculo opcional a una cuenta; puede existir sin cuenta.';

create table public.technician_categories (
  technician_id uuid not null references public.technicians (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  primary key (technician_id, category_id)
);
comment on table public.technician_categories is 'Designación de técnicos a categorías.';

-- Disparadores de updated_at.
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger roles_set_updated_at before update on public.roles
  for each row execute function public.set_updated_at();
create trigger supervisor_scopes_set_updated_at before update on public.supervisor_scopes
  for each row execute function public.set_updated_at();
create trigger requesters_set_updated_at before update on public.requesters
  for each row execute function public.set_updated_at();
create trigger technicians_set_updated_at before update on public.technicians
  for each row execute function public.set_updated_at();

-- RLS habilitado en todas (políticas en el tramo 8).
alter table public.profiles enable row level security;
alter table public.permissions enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.supervisor_scopes enable row level security;
alter table public.supervisor_scope_buildings enable row level security;
alter table public.requesters enable row level security;
alter table public.technicians enable row level security;
alter table public.technician_categories enable row level security;
