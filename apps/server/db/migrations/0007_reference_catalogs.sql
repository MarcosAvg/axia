-- Reference data needed for a clean installation. This is not demo data: it
-- contains no people, teams, buildings, requesters or tickets. Teams, buildings,
-- categories and tickets belong to the optional demo seed.

-- Master catalogs. Names are unique, so re-running this file is safe.
insert into public.service_types (name) values
  ('Correctivo'),
  ('Preventivo'),
  ('Inspección'),
  ('Mejora o instalación'),
  ('Emergencia')
on conflict (name) do nothing;

insert into public.priorities (name, "position", target_minutes) values
  ('Urgente', 1, 60),
  ('Alta', 2, 240),
  ('Media', 3, 1440),
  ('Baja', 4, 4320)
on conflict (name) do nothing;

insert into public.channels (name) values
  ('Web'),
  ('Teléfono'),
  ('Importación')
on conflict (name) do nothing;

update public.channels
set is_platform = true
where name = 'Web';

update public.instance_settings
set default_priority_id = (
  select id from public.priorities where name = 'Media'
)
where default_priority_id is null;

-- Work calendars. The timezone is the installation default and can be edited
-- from administration; changing it here never rewrites an existing value.
insert into public.work_calendars (name, timezone) values
  ('Oficina', 'America/Mexico_City'),
  ('Operación', 'America/Mexico_City')
on conflict (name) do nothing;

insert into public.work_calendar_intervals (
  calendar_id, weekday, start_time, end_time
)
select c.id, d.weekday, '08:00'::time, '17:00'::time
from public.work_calendars c
cross join (values (1), (2), (3), (4), (5)) as d (weekday)
where c.name = 'Oficina'
  and not exists (
    select 1 from public.work_calendar_intervals i
    where i.calendar_id = c.id
  );

insert into public.work_calendar_intervals (
  calendar_id, weekday, start_time, end_time
)
select c.id, d.weekday, '06:00'::time, '20:00'::time
from public.work_calendars c
cross join (values (1), (2), (3), (4), (5)) as d (weekday)
where c.name = 'Operación'
  and not exists (
    select 1 from public.work_calendar_intervals i
    where i.calendar_id = c.id
  );

insert into public.work_calendar_holidays (calendar_id, holiday, name)
select c.id, h.holiday, h.name
from public.work_calendars c
cross join (values
  ('2026-01-01'::date, 'Año Nuevo'),
  ('2026-02-02'::date, 'Día de la Constitución'),
  ('2026-03-16'::date, 'Natalicio de Benito Juárez'),
  ('2026-05-01'::date, 'Día del Trabajo'),
  ('2026-09-16'::date, 'Día de la Independencia'),
  ('2026-11-16'::date, 'Revolución Mexicana'),
  ('2026-12-25'::date, 'Navidad'),
  ('2027-01-01'::date, 'Año Nuevo'),
  ('2027-02-01'::date, 'Día de la Constitución'),
  ('2027-03-15'::date, 'Natalicio de Benito Juárez'),
  ('2027-05-01'::date, 'Día del Trabajo'),
  ('2027-09-16'::date, 'Día de la Independencia'),
  ('2027-11-15'::date, 'Revolución Mexicana'),
  ('2027-12-25'::date, 'Navidad')
) as h (holiday, name)
where c.name in ('Oficina', 'Operación')
on conflict (calendar_id, holiday) do nothing;

update public.instance_settings
set default_calendar_id = (
  select id from public.work_calendars where name = 'Oficina'
)
where default_calendar_id is null;

-- Escalation rules. The scheduler that consumes them is optional and not part
-- of this migration.
insert into public.escalation_rules (condition, threshold, notify) values
  ('untaken', interval '4 hours', 'administrators'),
  ('unassigned', interval '8 hours', 'supervisor'),
  ('no_candidate', interval '1 minute', 'administrators'),
  ('target_near', interval '30 minutes', 'supervisor'),
  ('target_overdue', interval '1 minute', 'supervisor')
on conflict (condition) do nothing;

-- Hierarchical reasons used by pauses, rejections, cancellations, reassignments,
-- recaptures, claims, reactivations and auxiliary support.
insert into public.reasons (use, name) values
  ('pause', 'Falta de material'),
  ('pause', 'Falta de personal'),
  ('pause', 'Proveedor o contratista externo'),
  ('pause', 'Acceso al área'),
  ('pause', 'Autorización'),
  ('pause', 'Herramienta o equipo especial'),
  ('pause', 'Condiciones externas'),
  ('pause', 'Dependencia de otro tiquet'),
  ('pause', 'Esperando información del solicitante'),
  ('pause', 'Programado'),
  ('rejection', 'Fuera de alcance'),
  ('rejection', 'Información insuficiente'),
  ('rejection', 'No se pudo reproducir la falla'),
  ('rejection', 'Responsabilidad de otra área'),
  ('rejection', 'Requiere proyecto u obra mayor'),
  ('rejection', 'Sin autorización o presupuesto'),
  ('rejection', 'Solicitud improcedente'),
  ('cancellation', 'A petición del solicitante'),
  ('cancellation', 'Creado por error'),
  ('cancellation', 'Ya no es necesario'),
  ('cancellation', 'Se resolvió por otro medio'),
  ('cancellation', 'Sin respuesta del solicitante'),
  ('cancellation', 'Decisión administrativa'),
  ('supervisor_reassignment', 'Equipo incorrecto'),
  ('supervisor_reassignment', 'Edificio incorrecto'),
  ('supervisor_reassignment', 'Categoría incorrecta'),
  ('supervisor_reassignment', 'Falta de competencia'),
  ('supervisor_reassignment', 'Ausencia o carga de trabajo'),
  ('technician_reassignment', 'Ausencia'),
  ('technician_reassignment', 'Carga de trabajo'),
  ('technician_reassignment', 'Falta de competencia'),
  ('technician_reassignment', 'Solicitud del técnico'),
  ('recapture', 'Categoría mal capturada'),
  ('recapture', 'Ubicación mal capturada'),
  ('recapture', 'Tipo de servicio mal capturado'),
  ('recapture', 'Prioridad mal capturada'),
  ('recapture', 'Descripción insuficiente'),
  ('claim', 'Trabajo incompleto'),
  ('claim', 'La falla persiste o regresó'),
  ('claim', 'Calidad deficiente'),
  ('claim', 'No corresponde a lo solicitado'),
  ('claim', 'Daño colateral o falta de limpieza'),
  ('claim_outcome', 'Procedente'),
  ('claim_outcome', 'Improcedente'),
  ('claim_outcome', 'Requiere tiquet nuevo'),
  ('reactivation', 'Error al descartar'),
  ('reactivation', 'Nueva información'),
  ('reactivation', 'Decisión administrativa'),
  ('auxiliary_support', 'Cobertura de ausencia'),
  ('auxiliary_support', 'Trabajo de más de una persona'),
  ('auxiliary_support', 'Apoyo por carga de trabajo'),
  ('auxiliary_support', 'Apoyo de otra área')
on conflict (use, parent_id, name) do nothing;

insert into public.reasons (use, name, parent_id)
select 'pause', v.name, p.id
from (values
  ('Por solicitar'),
  ('Solicitado'),
  ('En cotización'),
  ('Cotización aprobada'),
  ('Compra externa'),
  ('Salida de almacén'),
  ('En tránsito'),
  ('Recibido')
) as v (name)
cross join (
  select id from public.reasons
  where use = 'pause' and name = 'Falta de material'
) p
on conflict (use, parent_id, name) do nothing;

insert into public.reasons (use, name, parent_id)
select 'pause', v.name, p.id
from (values ('Con proveedor'), ('Sin proveedor')) as v (name)
cross join (
  select id from public.reasons
  where use = 'pause' and name = 'Por solicitar'
) p
on conflict (use, parent_id, name) do nothing;
