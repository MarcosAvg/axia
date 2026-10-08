-- Fase 5A, tramo 1: calendario laboral por equipo.
-- Si un equipo no define calendario, se usa el calendario por defecto de la instancia.

alter table public.teams
  add column work_calendar_id uuid references public.work_calendars (id);
comment on column public.teams.work_calendar_id is
  'Calendario laboral del equipo; si es NULL se usa instance_settings.default_calendar_id.';
