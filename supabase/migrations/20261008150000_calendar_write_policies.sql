-- Fase 5B-0, tramo 1: escritura de administración para los calendarios laborales.
-- Mismo patrón que el ADR 0018: los catálogos se desactivan (nunca se borran); las tablas de
-- relación (franjas y festivos) sí admiten DELETE. Permiso: catalog.manage.

create policy work_calendars_admin_insert on public.work_calendars
  for insert to authenticated
  with check (public.has_permission((select auth.uid()), 'catalog.manage'));
create policy work_calendars_admin_update on public.work_calendars
  for update to authenticated
  using (public.has_permission((select auth.uid()), 'catalog.manage'))
  with check (public.has_permission((select auth.uid()), 'catalog.manage'));

create policy work_calendar_intervals_admin_insert on public.work_calendar_intervals
  for insert to authenticated
  with check (public.has_permission((select auth.uid()), 'catalog.manage'));
create policy work_calendar_intervals_admin_update on public.work_calendar_intervals
  for update to authenticated
  using (public.has_permission((select auth.uid()), 'catalog.manage'))
  with check (public.has_permission((select auth.uid()), 'catalog.manage'));
create policy work_calendar_intervals_admin_delete on public.work_calendar_intervals
  for delete to authenticated
  using (public.has_permission((select auth.uid()), 'catalog.manage'));

create policy work_calendar_holidays_admin_insert on public.work_calendar_holidays
  for insert to authenticated
  with check (public.has_permission((select auth.uid()), 'catalog.manage'));
create policy work_calendar_holidays_admin_update on public.work_calendar_holidays
  for update to authenticated
  using (public.has_permission((select auth.uid()), 'catalog.manage'))
  with check (public.has_permission((select auth.uid()), 'catalog.manage'));
create policy work_calendar_holidays_admin_delete on public.work_calendar_holidays
  for delete to authenticated
  using (public.has_permission((select auth.uid()), 'catalog.manage'));
