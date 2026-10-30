-- Toda dependencia debe tener al menos una ubicación desde la versión actual.
-- Relleno: primero las ubicaciones donde ya se usó en tiquets; las dependencias
-- sin historial reciben todas las ubicaciones existentes para no quedar vacías.

insert into public.dependency_locations (dependency_id, location_id)
select distinct t.dependency_id, t.location_id
from public.tickets t
on conflict (dependency_id, location_id) do nothing;

insert into public.dependency_locations (dependency_id, location_id)
select d.id, l.id
from public.dependencies d
cross join public.locations l
where not exists (
  select 1
  from public.dependency_locations dl
  where dl.dependency_id = d.id
)
on conflict (dependency_id, location_id) do nothing;
