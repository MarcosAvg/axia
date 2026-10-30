-- Dependencias solicitantes por ubicación: N:M.
-- Una dependencia sin filas se considera disponible en todas las ubicaciones
-- (compatibilidad); en cuanto tiene vínculos, solo se ofrece en esos.

create table public.dependency_locations (
  dependency_id uuid not null references public.dependencies(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  primary key (dependency_id, location_id)
);

create index dependency_locations_location_idx
  on public.dependency_locations (location_id);

grant select, insert, delete on public.dependency_locations to axia_app;
