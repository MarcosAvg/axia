-- Corte limpio: la estructura de clasificación aún se está definiendo.
-- El equipo pasa de la categoría al problema. No se conservan tiquets,
-- clasificación ni designaciones anteriores.

truncate table public.tickets cascade;
truncate table public.categories cascade;

alter table public.problems add column team_id uuid not null;
alter table public.problems
  add constraint problems_team_id_fkey foreign key (team_id) references public.teams(id);

alter table public.categories drop constraint categories_team_id_name_key;
alter table public.categories drop constraint categories_team_id_fkey;
alter table public.categories drop column team_id;
alter table public.categories add constraint categories_name_key unique (name);
