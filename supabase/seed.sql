-- Semilla de datos ficticios de Axia. Se carga con `pnpm db:reset` y `supabase start`.
-- Los nombres de ejemplo llevan el sufijo "(ejemplo)" para no chocar con los datos de las pruebas.

-- Configuración de la instancia (una fila).
insert into public.instance_settings (singleton) values (true)
on conflict (singleton) do nothing;

-- Permisos fijos del sistema (conjunto definido por el sistema, no configurable).
insert into public.permissions (id, description) values
  ('ticket.create', 'Crear tiquets'),
  ('ticket.create_on_behalf', 'Crear tiquets a nombre de otro solicitante'),
  ('ticket.view', 'Ver tiquets (según ámbito)'),
  ('ticket.take_offer', 'Tomar un tiquet ofrecido'),
  ('ticket.assign_supervisor', 'Asignar o reasignar supervisor'),
  ('ticket.assign_technician', 'Asignar o reasignar técnico'),
  ('ticket.add_auxiliary', 'Agregar apoyo auxiliar'),
  ('ticket.recapture', 'Recapturar la captura del tiquet'),
  ('ticket.start', 'Iniciar el trabajo'),
  ('ticket.attend', 'Marcar como atendido'),
  ('ticket.pause', 'Pausar el tiquet'),
  ('ticket.resume', 'Reanudar el tiquet'),
  ('ticket.validate', 'Validar el tiquet'),
  ('ticket.validate_on_behalf', 'Validar a nombre del solicitante'),
  ('ticket.open_claim', 'Abrir una reclamación'),
  ('ticket.open_claim_on_behalf', 'Abrir una reclamación a nombre del solicitante'),
  ('ticket.resolve_claim', 'Resolver una reclamación'),
  ('ticket.reopen', 'Reabrir el tiquet'),
  ('ticket.reject', 'Rechazar el tiquet'),
  ('ticket.cancel', 'Cancelar el tiquet'),
  ('ticket.cancel_on_behalf', 'Cancelar a nombre del solicitante'),
  ('ticket.mark_duplicate', 'Marcar el tiquet como duplicado'),
  ('ticket.reactivate', 'Reactivar un tiquet descartado'),
  ('ticket.prioritize', 'Ajustar la prioridad'),
  ('ticket.rate', 'Calificar la satisfacción'),
  ('ticket.rate_on_behalf', 'Calificar a nombre del solicitante'),
  ('time.record_manual', 'Registrar o corregir tiempos manuales'),
  ('metrics.view', 'Ver métricas e indicadores'),
  ('data.import', 'Importar datos desde otras fuentes'),
  ('act_on_behalf', 'Actuar en nombre de otro'),
  ('catalog.manage', 'Administrar catálogos'),
  ('user.manage', 'Administrar usuarios'),
  ('role.manage', 'Administrar roles y permisos'),
  ('assignment.manage', 'Administrar designaciones y ámbitos')
on conflict (id) do nothing;

-- Roles semilla (configurables).
insert into public.roles (name, label) values
  ('administrator', 'Administrador'),
  ('supervisor', 'Supervisor'),
  ('technician', 'Técnico'),
  ('requester', 'Solicitante')
on conflict (name) do nothing;

-- Permisos por rol semilla.
insert into public.role_permissions (role_id, permission_id, scope)
select r.id, v.permission_id, v.scope::public.permission_scope
from (
  values
    ('requester', 'ticket.create', 'own'),
    ('requester', 'ticket.view', 'own'),
    ('requester', 'ticket.validate', 'own'),
    ('requester', 'ticket.open_claim', 'own'),
    ('requester', 'ticket.cancel', 'own'),
    ('requester', 'ticket.mark_duplicate', 'own'),
    ('requester', 'ticket.rate', 'own'),
    ('supervisor', 'ticket.view', 'buildings'),
    ('supervisor', 'ticket.take_offer', 'team'),
    ('supervisor', 'ticket.assign_supervisor', 'team'),
    ('supervisor', 'ticket.assign_technician', 'team'),
    ('supervisor', 'ticket.add_auxiliary', 'team'),
    ('supervisor', 'ticket.recapture', 'team'),
    ('supervisor', 'ticket.pause', 'team'),
    ('supervisor', 'ticket.resume', 'team'),
    ('supervisor', 'ticket.validate', 'team'),
    ('supervisor', 'ticket.validate_on_behalf', 'team'),
    ('supervisor', 'ticket.open_claim', 'team'),
    ('supervisor', 'ticket.open_claim_on_behalf', 'team'),
    ('supervisor', 'ticket.resolve_claim', 'team'),
    ('supervisor', 'ticket.reopen', 'team'),
    ('supervisor', 'ticket.reject', 'team'),
    ('supervisor', 'ticket.cancel', 'team'),
    ('supervisor', 'ticket.cancel_on_behalf', 'team'),
    ('supervisor', 'ticket.mark_duplicate', 'team'),
    ('supervisor', 'ticket.prioritize', 'team'),
    ('supervisor', 'ticket.rate_on_behalf', 'team'),
    ('supervisor', 'time.record_manual', 'team'),
    ('supervisor', 'metrics.view', 'buildings'),
    ('supervisor', 'act_on_behalf', 'team'),
    ('technician', 'ticket.view', 'own'),
    ('technician', 'ticket.recapture', 'own'),
    ('technician', 'ticket.start', 'own'),
    ('technician', 'ticket.attend', 'own'),
    ('technician', 'ticket.pause', 'own'),
    ('technician', 'ticket.resume', 'own'),
    ('technician', 'ticket.reject', 'own'),
    ('technician', 'ticket.cancel', 'own'),
    ('technician', 'ticket.mark_duplicate', 'own')
) as v (role_name, permission_id, scope)
join public.roles r on r.name = v.role_name
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id, scope)
select r.id, p.id, 'all'
from public.roles r
cross join public.permissions p
where r.name = 'administrator'
on conflict do nothing;

-- Reglas de notificación (evento → destinatario → canal).
insert into public.notification_rules (event_type, recipient, channel) values
  ('offered', 'offers', 'in_app'),
  ('taken', 'requester', 'in_app'),
  ('assigned_technician', 'assigned_technician', 'in_app'),
  ('attended', 'requester', 'in_app'),
  ('claim_opened', 'supervisor', 'in_app'),
  ('reopened', 'requester', 'in_app'),
  ('rejected', 'requester', 'in_app'),
  ('cancelled', 'requester', 'in_app'),
  ('duplicate_marked', 'requester', 'in_app')
on conflict do nothing;

-- Reglas de escalamiento.
insert into public.escalation_rules (condition, threshold, notify) values
  ('untaken', interval '4 hours', 'administrators'),
  ('unassigned', interval '8 hours', 'supervisor'),
  ('no_candidate', interval '1 minute', 'administrators'),
  ('target_near', interval '30 minutes', 'supervisor'),
  ('target_overdue', interval '1 minute', 'supervisor')
on conflict do nothing;

-- Catálogos maestros (ficticios; sufijo "(ejemplo)").
insert into public.teams (name) values ('Mantenimiento (ejemplo)'), ('Seguridad (ejemplo)')
on conflict do nothing;
insert into public.buildings (name) values ('Edificio Central (ejemplo)'), ('Edificio Norte (ejemplo)')
on conflict do nothing;
insert into public.locations (building_id, name)
select b.id, v.name from public.buildings b, (values ('Planta baja (ejemplo)'), ('Piso 1 (ejemplo)')) as v (name)
where b.name = 'Edificio Central (ejemplo)'
on conflict do nothing;
insert into public.dependencies (name)
values ('Sistemas (ejemplo)'), ('Recursos Humanos (ejemplo)')
on conflict do nothing;
insert into public.categories (team_id, name)
select t.id, v.name from public.teams t, (values ('Eléctrico (ejemplo)'), ('Plomería (ejemplo)')) as v (name)
where t.name = 'Mantenimiento (ejemplo)'
on conflict do nothing;
insert into public.categories (team_id, name)
select t.id, 'Accesos (ejemplo)' from public.teams t where t.name = 'Seguridad (ejemplo)'
on conflict do nothing;
insert into public.subcategories (category_id, name)
select c.id, 'Contacto (ejemplo)' from public.categories c where c.name = 'Eléctrico (ejemplo)'
on conflict do nothing;
insert into public.problems (subcategory_id, name)
select s.id, 'Chispa o corto (ejemplo)' from public.subcategories s where s.name = 'Contacto (ejemplo)'
on conflict do nothing;
insert into public.service_types (name)
values ('Correctivo (ejemplo)'), ('Preventivo (ejemplo)'), ('Inspección (ejemplo)'),
       ('Mejora o instalación (ejemplo)'), ('Emergencia (ejemplo)')
on conflict do nothing;
insert into public.priorities (name, position, target_minutes) values
  ('Urgente (ejemplo)', 1, 60), ('Alta (ejemplo)', 2, 240),
  ('Media (ejemplo)', 3, 1440), ('Baja (ejemplo)', 4, 4320)
on conflict do nothing;
insert into public.channels (name)
values ('Web (ejemplo)'), ('Teléfono (ejemplo)'), ('Importación (ejemplo)')
on conflict do nothing;

insert into public.technicians (full_name, team_id)
select v.name, t.id from public.teams t, (values ('Luis Gómez (ejemplo)'), ('Marta Ruiz (ejemplo)')) as v (name)
where t.name = 'Mantenimiento (ejemplo)'
  and not exists (select 1 from public.technicians where full_name = v.name);

insert into public.requesters (full_name, contact, dependency_id)
select v.name, v.contact, d.id
from public.dependencies d,
     (values ('Ana Pérez (ejemplo)', 'ext. 100'), ('Beto Lima (ejemplo)', 'ext. 200')) as v (name, contact)
where d.name = 'Sistemas (ejemplo)'
  and not exists (select 1 from public.requesters where full_name = v.name);

-- Usuarios demo ficticios (solo entorno local). La contraseña local está documentada en README.md.
-- El perfil lo crea el disparador on_auth_user_created (Fase 2) desde raw_user_meta_data.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
select
  '00000000-0000-0000-0000-000000000000', v.id, 'authenticated', 'authenticated',
  v.email, extensions.crypt('AxiaDemo2026!', extensions.gen_salt('bf')), now(),
  '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', v.full_name),
  now(), now()
from (values
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'admin@axia.test', 'Admin Demo'),
  ('a0000000-0000-4000-8000-000000000002'::uuid, 'supervisor@axia.test', 'Supervisor Demo'),
  ('a0000000-0000-4000-8000-000000000003'::uuid, 'tecnico@axia.test', 'Técnico Demo'),
  ('a0000000-0000-4000-8000-000000000004'::uuid, 'solicitante@axia.test', 'Solicitante Demo')
) as v (id, email, full_name)
on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(), v.id, v.id::text,
  jsonb_build_object('sub', v.id::text, 'email', v.email, 'email_verified', true),
  'email', now(), now(), now()
from (values
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'admin@axia.test'),
  ('a0000000-0000-4000-8000-000000000002'::uuid, 'supervisor@axia.test'),
  ('a0000000-0000-4000-8000-000000000003'::uuid, 'tecnico@axia.test'),
  ('a0000000-0000-4000-8000-000000000004'::uuid, 'solicitante@axia.test')
) as v (id, email)
on conflict (provider_id, provider) do nothing;

insert into public.user_roles (user_id, role_id)
select v.id, r.id
from (values
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'administrator'),
  ('a0000000-0000-4000-8000-000000000002'::uuid, 'supervisor'),
  ('a0000000-0000-4000-8000-000000000003'::uuid, 'technician'),
  ('a0000000-0000-4000-8000-000000000004'::uuid, 'requester')
) as v (id, role_name)
join public.roles r on r.name = v.role_name
on conflict do nothing;

-- Vínculos de los usuarios demo con los catálogos (técnico y solicitante).
update public.technicians set user_id = 'a0000000-0000-4000-8000-000000000003'
where full_name = 'Luis Gómez (ejemplo)' and user_id is null;
update public.requesters set user_id = 'a0000000-0000-4000-8000-000000000004'
where full_name = 'Ana Pérez (ejemplo)' and user_id is null;

-- Ámbito del supervisor demo: equipo de mantenimiento y edificio central.
insert into public.supervisor_scopes (user_id, team_id)
select 'a0000000-0000-4000-8000-000000000002', t.id
from public.teams t where t.name = 'Mantenimiento (ejemplo)'
on conflict (user_id, team_id) do nothing;
insert into public.supervisor_scope_buildings (scope_id, building_id)
select ss.id, b.id
from public.supervisor_scopes ss, public.buildings b
where ss.user_id = 'a0000000-0000-4000-8000-000000000002'
  and b.name = 'Edificio Central (ejemplo)'
on conflict do nothing;

-- Calendarios laborales (cobertura por equipo; los turnos internos no cambian la cobertura).
insert into public.work_calendars (name, timezone) values
  ('Mantenimiento', 'America/Mexico_City'),
  ('Oficina', 'America/Mexico_City')
on conflict (name) do nothing;

-- Mantenimiento: cobertura de 06:00 a 20:00 (unión de sus tres turnos solapados).
insert into public.work_calendar_intervals (calendar_id, weekday, start_time, end_time)
select c.id, d.weekday, '06:00', '20:00'
from public.work_calendars c, (values (1), (2), (3), (4), (5)) as d (weekday)
where c.name = 'Mantenimiento'
  and not exists (select 1 from public.work_calendar_intervals i where i.calendar_id = c.id);

-- Oficina: 08:00 a 17:00 (el resto de los equipos).
insert into public.work_calendar_intervals (calendar_id, weekday, start_time, end_time)
select c.id, d.weekday, '08:00', '17:00'
from public.work_calendars c, (values (1), (2), (3), (4), (5)) as d (weekday)
where c.name = 'Oficina'
  and not exists (select 1 from public.work_calendar_intervals i where i.calendar_id = c.id);

-- Festivos oficiales de México (editables: se agregan o quitan desde la administración).
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
where c.name in ('Mantenimiento', 'Oficina')
on conflict (calendar_id, holiday) do nothing;

-- El calendario por defecto es el de oficina; Mantenimiento tiene el suyo.
update public.instance_settings
  set default_calendar_id = (select id from public.work_calendars where name = 'Oficina')
  where default_calendar_id is null;
update public.teams
  set work_calendar_id = case
    when name = 'Mantenimiento (ejemplo)'
      then (select id from public.work_calendars where name = 'Mantenimiento')
    else (select id from public.work_calendars where name = 'Oficina')
  end
  where work_calendar_id is null;

-- Motivos jerárquicos (especificación §6; sufijo "(ejemplo)").
insert into public.reasons (use, name) values
  ('pause', 'Falta de material (ejemplo)'), ('pause', 'Falta de personal (ejemplo)'),
  ('pause', 'Proveedor o contratista externo (ejemplo)'), ('pause', 'Acceso al área (ejemplo)'),
  ('pause', 'Autorización (ejemplo)'), ('pause', 'Herramienta o equipo especial (ejemplo)'),
  ('pause', 'Condiciones externas (ejemplo)'), ('pause', 'Dependencia de otro tiquet (ejemplo)'),
  ('pause', 'Esperando información del solicitante (ejemplo)'), ('pause', 'Programado (ejemplo)'),
  ('rejection', 'Fuera de alcance (ejemplo)'), ('rejection', 'Información insuficiente (ejemplo)'),
  ('rejection', 'No se pudo reproducir la falla (ejemplo)'),
  ('rejection', 'Responsabilidad de otra área (ejemplo)'),
  ('rejection', 'Requiere proyecto u obra mayor (ejemplo)'),
  ('rejection', 'Sin autorización o presupuesto (ejemplo)'),
  ('rejection', 'Solicitud improcedente (ejemplo)'),
  ('cancellation', 'A petición del solicitante (ejemplo)'), ('cancellation', 'Creado por error (ejemplo)'),
  ('cancellation', 'Ya no es necesario (ejemplo)'), ('cancellation', 'Se resolvió por otro medio (ejemplo)'),
  ('cancellation', 'Sin respuesta del solicitante (ejemplo)'),
  ('cancellation', 'Decisión administrativa (ejemplo)'),
  ('supervisor_reassignment', 'Equipo incorrecto (ejemplo)'),
  ('supervisor_reassignment', 'Edificio incorrecto (ejemplo)'),
  ('supervisor_reassignment', 'Categoría incorrecta (ejemplo)'),
  ('supervisor_reassignment', 'Falta de competencia (ejemplo)'),
  ('supervisor_reassignment', 'Ausencia o carga de trabajo (ejemplo)'),
  ('technician_reassignment', 'Ausencia (ejemplo)'),
  ('technician_reassignment', 'Carga de trabajo (ejemplo)'),
  ('technician_reassignment', 'Falta de competencia (ejemplo)'),
  ('technician_reassignment', 'Solicitud del técnico (ejemplo)'),
  ('recapture', 'Categoría mal capturada (ejemplo)'), ('recapture', 'Ubicación mal capturada (ejemplo)'),
  ('recapture', 'Tipo de servicio mal capturado (ejemplo)'),
  ('recapture', 'Prioridad mal capturada (ejemplo)'),
  ('recapture', 'Descripción insuficiente (ejemplo)'),
  ('claim', 'Trabajo incompleto (ejemplo)'), ('claim', 'La falla persiste o regresó (ejemplo)'),
  ('claim', 'Calidad deficiente (ejemplo)'), ('claim', 'No corresponde a lo solicitado (ejemplo)'),
  ('claim', 'Daño colateral o falta de limpieza (ejemplo)'),
  ('claim_outcome', 'Procedente (ejemplo)'), ('claim_outcome', 'Improcedente (ejemplo)'),
  ('claim_outcome', 'Requiere tiquet nuevo (ejemplo)'),
  ('reactivation', 'Error al descartar (ejemplo)'), ('reactivation', 'Nueva información (ejemplo)'),
  ('reactivation', 'Decisión administrativa (ejemplo)'),
  ('auxiliary_support', 'Cobertura de ausencia (ejemplo)'),
  ('auxiliary_support', 'Trabajo de más de una persona (ejemplo)'),
  ('auxiliary_support', 'Apoyo por carga de trabajo (ejemplo)'),
  ('auxiliary_support', 'Apoyo de otra área (ejemplo)')
on conflict do nothing;

insert into public.reasons (use, name, parent_id)
select 'pause', v.name, p.id
from (values ('Por solicitar (ejemplo)'), ('Solicitado (ejemplo)'), ('En cotización (ejemplo)'),
             ('Cotización aprobada (ejemplo)'), ('Compra externa (ejemplo)'),
             ('Salida de almacén (ejemplo)'), ('En tránsito (ejemplo)'), ('Recibido (ejemplo)')) as v (name)
cross join (
  select id from public.reasons where use = 'pause' and name = 'Falta de material (ejemplo)'
) p
on conflict do nothing;
