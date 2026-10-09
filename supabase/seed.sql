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

-- ============================================================================
-- Tiquets de demostración (solo entorno local).
--
-- Reparten los estados para que todas las vistas tengan datos: bandejas, tablero,
-- métricas, duplicados, satisfacción y SLA. Las marcas de tiempo van retrasadas
-- respecto a `now()` para no alterar el orden que esperan las pruebas de Playwright
-- (que crean tiquets al momento). Los identificadores son fijos para que la
-- semilla sea idempotente; los eventos generan los tramos de tiempo por disparador.
-- ============================================================================

-- Ubicaciones del Edificio Norte (faltaban; los tiquets requieren ubicación del edificio).
insert into public.locations (building_id, name)
select b.id, v.name from public.buildings b,
  (values ('Planta baja (ejemplo)'), ('Piso 1 (ejemplo)')) as v (name)
where b.name = 'Edificio Norte (ejemplo)'
on conflict do nothing;

do $$
begin
  if exists (
    select 1 from public.tickets where id = 'b0000000-0000-4000-8000-000000000001'
  ) then
    return;
  end if;

  -- Tiquets: uno por estado y variantes, en dos edificios y dos equipos.
  insert into public.tickets (
    id, status, cycle, team_id, building_id, location_id, dependency_id, category_id,
    subcategory_id, problem_id, service_type_id, priority_id, channel_id, description,
    requester_id, requester_name, requester_contact, registered_by, reported_at,
    closed_at, possible_duplicate, duplicate_of_id, status_before_discard)
  select
    v.id, v.status, 1, cat.team_id, b.id, loc.id, dep.id, cat.id,
    sub.id, prb.id, st.id, pr.id, ch.id, v.description,
    req.id, req.full_name, req.contact, v.registered_by, v.reported_at,
    v.closed_at, v.possible_duplicate, v.duplicate_of, v.status_before_discard
  from (values
    ('b0000000-0000-4000-8000-000000000001'::uuid, 'registered'::public.ticket_status,
     'Eléctrico (ejemplo)', 'Contacto (ejemplo)', 'Chispa o corto (ejemplo)', 'Correctivo (ejemplo)',
     'Media (ejemplo)', 'Web (ejemplo)', 'Edificio Central (ejemplo)', 'Planta baja (ejemplo)',
     'Ana Pérez (ejemplo)', 'No enciende la luz del pasillo del ala norte (ejemplo)',
     now() - interval '2 hours', null::timestamptz, false, null::uuid, null::public.ticket_status,
     'a0000000-0000-4000-8000-000000000004'::uuid),
    ('b0000000-0000-4000-8000-000000000002'::uuid, 'with_supervisor'::public.ticket_status,
     'Eléctrico (ejemplo)', null, null, 'Correctivo (ejemplo)', 'Alta (ejemplo)', 'Teléfono (ejemplo)',
     'Edificio Central (ejemplo)', 'Piso 1 (ejemplo)', 'Ana Pérez (ejemplo)',
     'Contacto eléctrico suelto en la sala de juntas (ejemplo)',
     now() - interval '1 day', null, false, null, null,
     'a0000000-0000-4000-8000-000000000002'),
    ('b0000000-0000-4000-8000-000000000003'::uuid, 'assigned'::public.ticket_status,
     'Plomería (ejemplo)', null, null, 'Correctivo (ejemplo)', 'Media (ejemplo)', 'Web (ejemplo)',
     'Edificio Central (ejemplo)', 'Planta baja (ejemplo)', 'Beto Lima (ejemplo)',
     'Fuga de agua en el baño de planta baja (ejemplo)',
     now() - interval '2 days', null, false, null, null,
     'a0000000-0000-4000-8000-000000000004'),
    ('b0000000-0000-4000-8000-000000000004'::uuid, 'in_progress'::public.ticket_status,
     'Eléctrico (ejemplo)', 'Contacto (ejemplo)', 'Chispa o corto (ejemplo)', 'Emergencia (ejemplo)',
     'Urgente (ejemplo)', 'Teléfono (ejemplo)', 'Edificio Central (ejemplo)', 'Piso 1 (ejemplo)',
     'Ana Pérez (ejemplo)', 'Olor a quemado en el tablero del piso 1 (ejemplo)',
     now() - interval '3 days', null, false, null, null,
     'a0000000-0000-4000-8000-000000000002'),
    ('b0000000-0000-4000-8000-000000000005'::uuid, 'paused'::public.ticket_status,
     'Eléctrico (ejemplo)', null, null, 'Correctivo (ejemplo)', 'Media (ejemplo)', 'Web (ejemplo)',
     'Edificio Central (ejemplo)', 'Planta baja (ejemplo)', 'Ana Pérez (ejemplo)',
     'Lámpara del recibidor intermitente (ejemplo)',
     now() - interval '4 days', null, false, null, null,
     'a0000000-0000-4000-8000-000000000004'),
    ('b0000000-0000-4000-8000-000000000006'::uuid, 'attended'::public.ticket_status,
     'Eléctrico (ejemplo)', null, null, 'Preventivo (ejemplo)', 'Alta (ejemplo)', 'Web (ejemplo)',
     'Edificio Central (ejemplo)', 'Piso 1 (ejemplo)', 'Beto Lima (ejemplo)',
     'Revisión de contactos del área de sistemas (ejemplo)',
     now() - interval '5 days', null, false, null, null,
     'a0000000-0000-4000-8000-000000000002'),
    ('b0000000-0000-4000-8000-000000000007'::uuid, 'closed'::public.ticket_status,
     'Eléctrico (ejemplo)', 'Contacto (ejemplo)', 'Chispa o corto (ejemplo)', 'Correctivo (ejemplo)',
     'Media (ejemplo)', 'Web (ejemplo)', 'Edificio Central (ejemplo)', 'Planta baja (ejemplo)',
     'Ana Pérez (ejemplo)', 'Cortocircuito en la toma de la recepción (ejemplo)',
     now() - interval '8 days', now() - interval '6 days 23 hours', false, null, null,
     'a0000000-0000-4000-8000-000000000004'),
    ('b0000000-0000-4000-8000-000000000008'::uuid, 'closed'::public.ticket_status,
     'Plomería (ejemplo)', null, null, 'Correctivo (ejemplo)', 'Baja (ejemplo)', 'Teléfono (ejemplo)',
     'Edificio Central (ejemplo)', 'Piso 1 (ejemplo)', 'Beto Lima (ejemplo)',
     'Goteo en el lavabo del piso 1 (ejemplo)',
     now() - interval '12 days', now() - interval '10 days', false, null, null,
     'a0000000-0000-4000-8000-000000000004'),
    ('b0000000-0000-4000-8000-000000000009'::uuid, 'under_claim'::public.ticket_status,
     'Eléctrico (ejemplo)', null, null, 'Correctivo (ejemplo)', 'Alta (ejemplo)', 'Web (ejemplo)',
     'Edificio Central (ejemplo)', 'Planta baja (ejemplo)', 'Ana Pérez (ejemplo)',
     'La falla de iluminación persiste (ejemplo)',
     now() - interval '6 days', null, false, null, null,
     'a0000000-0000-4000-8000-000000000002'),
    ('b0000000-0000-4000-8000-000000000010'::uuid, 'rejected'::public.ticket_status,
     'Eléctrico (ejemplo)', null, null, 'Inspección (ejemplo)', 'Media (ejemplo)', 'Web (ejemplo)',
     'Edificio Central (ejemplo)', 'Piso 1 (ejemplo)', 'Beto Lima (ejemplo)',
     'Solicitud de cambio de luminarias por estética (ejemplo)',
     now() - interval '9 days', null, false, null, 'with_supervisor'::public.ticket_status,
     'a0000000-0000-4000-8000-000000000004'),
    ('b0000000-0000-4000-8000-000000000011'::uuid, 'cancelled'::public.ticket_status,
     'Eléctrico (ejemplo)', null, null, 'Correctivo (ejemplo)', 'Baja (ejemplo)', 'Web (ejemplo)',
     'Edificio Central (ejemplo)', 'Planta baja (ejemplo)', 'Ana Pérez (ejemplo)',
     'Reporte duplicado por error del solicitante (ejemplo)',
     now() - interval '10 days', null, false, null, 'registered'::public.ticket_status,
     'a0000000-0000-4000-8000-000000000004'),
    ('b0000000-0000-4000-8000-000000000012'::uuid, 'duplicate'::public.ticket_status,
     'Plomería (ejemplo)', null, null, 'Correctivo (ejemplo)', 'Media (ejemplo)', 'Web (ejemplo)',
     'Edificio Central (ejemplo)', 'Piso 1 (ejemplo)', 'Beto Lima (ejemplo)',
     'Fuga repetida, ya reportada antes (ejemplo)',
     now() - interval '7 days', null, true,
     'b0000000-0000-4000-8000-000000000007'::uuid, 'registered'::public.ticket_status,
     'a0000000-0000-4000-8000-000000000004'),
    ('b0000000-0000-4000-8000-000000000013'::uuid, 'assigned'::public.ticket_status,
     'Plomería (ejemplo)', null, null, 'Preventivo (ejemplo)', 'Media (ejemplo)', 'Web (ejemplo)',
     'Edificio Central (ejemplo)', 'Planta baja (ejemplo)', 'Ana Pérez (ejemplo)',
     'Mantenimiento preventivo de tuberías (ejemplo)',
     now() - interval '1 day 12 hours', null, false, null, null,
     'a0000000-0000-4000-8000-000000000002'),
    ('b0000000-0000-4000-8000-000000000014'::uuid, 'registered'::public.ticket_status,
     'Accesos (ejemplo)', null, null, 'Correctivo (ejemplo)', 'Alta (ejemplo)', 'Teléfono (ejemplo)',
     'Edificio Norte (ejemplo)', 'Planta baja (ejemplo)', 'Beto Lima (ejemplo)',
     'La puerta de acceso principal no cierra (ejemplo)',
     now() - interval '3 hours', null, false, null, null,
     'a0000000-0000-4000-8000-000000000002'),
    ('b0000000-0000-4000-8000-000000000015'::uuid, 'closed'::public.ticket_status,
     'Eléctrico (ejemplo)', null, null, 'Mejora o instalación (ejemplo)', 'Media (ejemplo)', 'Web (ejemplo)',
     'Edificio Central (ejemplo)', 'Planta baja (ejemplo)', 'Ana Pérez (ejemplo)',
     'Instalación de contactos en el área de archivo (ejemplo)',
     now() - interval '20 days', now() - interval '18 days', false, null, null,
     'a0000000-0000-4000-8000-000000000004')
  ) as v (id, status, category, subcategory, problem, service_type, priority, channel,
          building, location, requester, description, reported_at, closed_at,
          possible_duplicate, duplicate_of, status_before_discard, registered_by)
  join public.categories cat on cat.name = v.category
  join public.buildings b on b.name = v.building
  join public.locations loc on loc.building_id = b.id and loc.name = v.location
  join public.dependencies dep on dep.name = 'Sistemas (ejemplo)'
  join public.service_types st on st.name = v.service_type
  join public.priorities pr on pr.name = v.priority
  join public.channels ch on ch.name = v.channel
  join public.requesters req on req.full_name = v.requester
  left join public.subcategories sub on sub.name = v.subcategory and sub.category_id = cat.id
  left join public.problems prb on prb.name = v.problem and prb.subcategory_id = sub.id;

  -- Bitácora en orden cronológico; dispara la creación de los tramos de tiempo.
  insert into public.ticket_events (
    ticket_id, cycle, type, actor_id, reason_id, subject_technician_id, occurred_at, payload)
  select v.ticket_id, 1, v.type, v.actor, r.id, t.id, v.occurred_at, v.payload
  from (values
    ('b0000000-0000-4000-8000-000000000001'::uuid, 'created'::public.event_type,
     now() - interval '2 hours', 'a0000000-0000-4000-8000-000000000004'::uuid,
     null::text, null::text, '{}'::jsonb),
    ('b0000000-0000-4000-8000-000000000002'::uuid, 'created'::public.event_type,
     now() - interval '1 day', 'a0000000-0000-4000-8000-000000000002'::uuid, null, null, '{}'),
    ('b0000000-0000-4000-8000-000000000002'::uuid, 'taken'::public.event_type,
     now() - interval '20 hours', 'a0000000-0000-4000-8000-000000000002'::uuid, null, null, '{}'),
    ('b0000000-0000-4000-8000-000000000003'::uuid, 'created'::public.event_type,
     now() - interval '2 days', 'a0000000-0000-4000-8000-000000000004'::uuid, null, null, '{}'),
    ('b0000000-0000-4000-8000-000000000003'::uuid, 'taken'::public.event_type,
     now() - interval '1 day 20 hours', 'a0000000-0000-4000-8000-000000000002'::uuid, null, null, '{}'),
    ('b0000000-0000-4000-8000-000000000003'::uuid, 'assigned_technician'::public.event_type,
     now() - interval '1 day 12 hours', 'a0000000-0000-4000-8000-000000000002'::uuid,
     null, 'Luis Gómez (ejemplo)', '{}'),
    ('b0000000-0000-4000-8000-000000000004'::uuid, 'created'::public.event_type,
     now() - interval '3 days', 'a0000000-0000-4000-8000-000000000002'::uuid, null, null, '{}'),
    ('b0000000-0000-4000-8000-000000000004'::uuid, 'taken'::public.event_type,
     now() - interval '2 days 23 hours', 'a0000000-0000-4000-8000-000000000002'::uuid, null, null, '{}'),
    ('b0000000-0000-4000-8000-000000000004'::uuid, 'assigned_technician'::public.event_type,
     now() - interval '2 days 22 hours', 'a0000000-0000-4000-8000-000000000002'::uuid,
     null, 'Luis Gómez (ejemplo)', '{}'),
    ('b0000000-0000-4000-8000-000000000004'::uuid, 'started'::public.event_type,
     now() - interval '2 days 18 hours', 'a0000000-0000-4000-8000-000000000003'::uuid, null, null, '{}'),
    ('b0000000-0000-4000-8000-000000000005'::uuid, 'created'::public.event_type,
     now() - interval '4 days', 'a0000000-0000-4000-8000-000000000004'::uuid, null, null, '{}'),
    ('b0000000-0000-4000-8000-000000000005'::uuid, 'taken'::public.event_type,
     now() - interval '3 days 23 hours', 'a0000000-0000-4000-8000-000000000002'::uuid, null, null, '{}'),
    ('b0000000-0000-4000-8000-000000000005'::uuid, 'assigned_technician'::public.event_type,
     now() - interval '3 days 22 hours', 'a0000000-0000-4000-8000-000000000002'::uuid,
     null, 'Luis Gómez (ejemplo)', '{}'),
    ('b0000000-0000-4000-8000-000000000005'::uuid, 'started'::public.event_type,
     now() - interval '3 days 20 hours', 'a0000000-0000-4000-8000-000000000003'::uuid, null, null, '{}'),
    ('b0000000-0000-4000-8000-000000000005'::uuid, 'paused'::public.event_type,
     now() - interval '2 days', 'a0000000-0000-4000-8000-000000000003'::uuid,
     'Falta de material (ejemplo)', null, '{}'),
    ('b0000000-0000-4000-8000-000000000006'::uuid, 'created'::public.event_type,
     now() - interval '5 days', 'a0000000-0000-4000-8000-000000000002'::uuid, null, null, '{}'),
    ('b0000000-0000-4000-8000-000000000006'::uuid, 'taken'::public.event_type,
     now() - interval '4 days 23 hours', 'a0000000-0000-4000-8000-000000000002'::uuid, null, null, '{}'),
    ('b0000000-0000-4000-8000-000000000006'::uuid, 'assigned_technician'::public.event_type,
     now() - interval '4 days 22 hours', 'a0000000-0000-4000-8000-000000000002'::uuid,
     null, 'Luis Gómez (ejemplo)', '{}'),
    ('b0000000-0000-4000-8000-000000000006'::uuid, 'started'::public.event_type,
     now() - interval '4 days 20 hours', 'a0000000-0000-4000-8000-000000000003'::uuid, null, null, '{}'),
    ('b0000000-0000-4000-8000-000000000006'::uuid, 'attended'::public.event_type,
     now() - interval '4 days', 'a0000000-0000-4000-8000-000000000003'::uuid, null, null,
     '{"work_description":"Se reemplazaron los contactos (ejemplo)"}'),
    ('b0000000-0000-4000-8000-000000000007'::uuid, 'created'::public.event_type,
     now() - interval '8 days', 'a0000000-0000-4000-8000-000000000004'::uuid, null, null, '{}'),
    ('b0000000-0000-4000-8000-000000000007'::uuid, 'taken'::public.event_type,
     now() - interval '7 days 23 hours', 'a0000000-0000-4000-8000-000000000002'::uuid, null, null, '{}'),
    ('b0000000-0000-4000-8000-000000000007'::uuid, 'assigned_technician'::public.event_type,
     now() - interval '7 days 22 hours', 'a0000000-0000-4000-8000-000000000002'::uuid,
     null, 'Luis Gómez (ejemplo)', '{}'),
    ('b0000000-0000-4000-8000-000000000007'::uuid, 'started'::public.event_type,
     now() - interval '7 days 20 hours', 'a0000000-0000-4000-8000-000000000003'::uuid, null, null, '{}'),
    ('b0000000-0000-4000-8000-000000000007'::uuid, 'paused'::public.event_type,
     now() - interval '7 days 12 hours', 'a0000000-0000-4000-8000-000000000003'::uuid,
     'Falta de material (ejemplo)', null, '{}'),
    ('b0000000-0000-4000-8000-000000000007'::uuid, 'resumed'::public.event_type,
     now() - interval '7 days 8 hours', 'a0000000-0000-4000-8000-000000000003'::uuid, null, null, '{}'),
    ('b0000000-0000-4000-8000-000000000007'::uuid, 'attended'::public.event_type,
     now() - interval '7 days', 'a0000000-0000-4000-8000-000000000003'::uuid, null, null,
     '{"work_description":"Se reparó el cortocircuito (ejemplo)"}'),
    ('b0000000-0000-4000-8000-000000000007'::uuid, 'validated'::public.event_type,
     now() - interval '6 days 23 hours', 'a0000000-0000-4000-8000-000000000002'::uuid, null, null, '{}'),
    ('b0000000-0000-4000-8000-000000000008'::uuid, 'created'::public.event_type,
     now() - interval '12 days', 'a0000000-0000-4000-8000-000000000004'::uuid, null, null, '{}'),
    ('b0000000-0000-4000-8000-000000000008'::uuid, 'taken'::public.event_type,
     now() - interval '11 days 23 hours', 'a0000000-0000-4000-8000-000000000002'::uuid, null, null, '{}'),
    ('b0000000-0000-4000-8000-000000000008'::uuid, 'assigned_technician'::public.event_type,
     now() - interval '11 days 22 hours', 'a0000000-0000-4000-8000-000000000002'::uuid,
     null, 'Luis Gómez (ejemplo)', '{}'),
    ('b0000000-0000-4000-8000-000000000008'::uuid, 'started'::public.event_type,
     now() - interval '11 days 20 hours', 'a0000000-0000-4000-8000-000000000003'::uuid, null, null, '{}'),
    ('b0000000-0000-4000-8000-000000000008'::uuid, 'attended'::public.event_type,
     now() - interval '11 days', 'a0000000-0000-4000-8000-000000000003'::uuid, null, null,
     '{"work_description":"Se cambió el empaque del lavabo (ejemplo)"}'),
    ('b0000000-0000-4000-8000-000000000008'::uuid, 'validated'::public.event_type,
     now() - interval '10 days', 'a0000000-0000-4000-8000-000000000002'::uuid, null, null, '{}'),
    ('b0000000-0000-4000-8000-000000000009'::uuid, 'created'::public.event_type,
     now() - interval '6 days', 'a0000000-0000-4000-8000-000000000002'::uuid, null, null, '{}'),
    ('b0000000-0000-4000-8000-000000000009'::uuid, 'taken'::public.event_type,
     now() - interval '5 days 23 hours', 'a0000000-0000-4000-8000-000000000002'::uuid, null, null, '{}'),
    ('b0000000-0000-4000-8000-000000000009'::uuid, 'assigned_technician'::public.event_type,
     now() - interval '5 days 22 hours', 'a0000000-0000-4000-8000-000000000002'::uuid,
     null, 'Luis Gómez (ejemplo)', '{}'),
    ('b0000000-0000-4000-8000-000000000009'::uuid, 'started'::public.event_type,
     now() - interval '5 days 20 hours', 'a0000000-0000-4000-8000-000000000003'::uuid, null, null, '{}'),
    ('b0000000-0000-4000-8000-000000000009'::uuid, 'attended'::public.event_type,
     now() - interval '5 days 12 hours', 'a0000000-0000-4000-8000-000000000003'::uuid, null, null,
     '{"work_description":"Se ajustó la luminaria (ejemplo)"}'),
    ('b0000000-0000-4000-8000-000000000009'::uuid, 'claim_opened'::public.event_type,
     now() - interval '5 days', 'a0000000-0000-4000-8000-000000000004'::uuid,
     'Trabajo incompleto (ejemplo)', null, '{}'),
    ('b0000000-0000-4000-8000-000000000010'::uuid, 'created'::public.event_type,
     now() - interval '9 days', 'a0000000-0000-4000-8000-000000000004'::uuid, null, null, '{}'),
    ('b0000000-0000-4000-8000-000000000010'::uuid, 'taken'::public.event_type,
     now() - interval '8 days 23 hours', 'a0000000-0000-4000-8000-000000000002'::uuid, null, null, '{}'),
    ('b0000000-0000-4000-8000-000000000010'::uuid, 'rejected'::public.event_type,
     now() - interval '8 days 12 hours', 'a0000000-0000-4000-8000-000000000002'::uuid,
     'Fuera de alcance (ejemplo)', null, '{}'),
    ('b0000000-0000-4000-8000-000000000011'::uuid, 'created'::public.event_type,
     now() - interval '10 days', 'a0000000-0000-4000-8000-000000000004'::uuid, null, null, '{}'),
    ('b0000000-0000-4000-8000-000000000011'::uuid, 'cancelled'::public.event_type,
     now() - interval '9 days 12 hours', 'a0000000-0000-4000-8000-000000000004'::uuid,
     'A petición del solicitante (ejemplo)', null, '{}'),
    ('b0000000-0000-4000-8000-000000000012'::uuid, 'created'::public.event_type,
     now() - interval '7 days', 'a0000000-0000-4000-8000-000000000004'::uuid, null, null, '{}'),
    ('b0000000-0000-4000-8000-000000000012'::uuid, 'duplicate_marked'::public.event_type,
     now() - interval '6 days 22 hours', 'a0000000-0000-4000-8000-000000000002'::uuid, null, null, '{}'),
    ('b0000000-0000-4000-8000-000000000013'::uuid, 'created'::public.event_type,
     now() - interval '1 day 12 hours', 'a0000000-0000-4000-8000-000000000002'::uuid, null, null, '{}'),
    ('b0000000-0000-4000-8000-000000000013'::uuid, 'taken'::public.event_type,
     now() - interval '1 day 10 hours', 'a0000000-0000-4000-8000-000000000002'::uuid, null, null, '{}'),
    ('b0000000-0000-4000-8000-000000000013'::uuid, 'assigned_technician'::public.event_type,
     now() - interval '1 day', 'a0000000-0000-4000-8000-000000000002'::uuid,
     null, 'Marta Ruiz (ejemplo)', '{}'),
    ('b0000000-0000-4000-8000-000000000014'::uuid, 'created'::public.event_type,
     now() - interval '3 hours', 'a0000000-0000-4000-8000-000000000002'::uuid, null, null, '{}'),
    ('b0000000-0000-4000-8000-000000000015'::uuid, 'created'::public.event_type,
     now() - interval '20 days', 'a0000000-0000-4000-8000-000000000004'::uuid, null, null, '{}'),
    ('b0000000-0000-4000-8000-000000000015'::uuid, 'taken'::public.event_type,
     now() - interval '19 days 23 hours', 'a0000000-0000-4000-8000-000000000002'::uuid, null, null, '{}'),
    ('b0000000-0000-4000-8000-000000000015'::uuid, 'assigned_technician'::public.event_type,
     now() - interval '19 days 22 hours', 'a0000000-0000-4000-8000-000000000002'::uuid,
     null, 'Luis Gómez (ejemplo)', '{}'),
    ('b0000000-0000-4000-8000-000000000015'::uuid, 'started'::public.event_type,
     now() - interval '19 days 20 hours', 'a0000000-0000-4000-8000-000000000003'::uuid, null, null, '{}'),
    ('b0000000-0000-4000-8000-000000000015'::uuid, 'attended'::public.event_type,
     now() - interval '19 days 12 hours', 'a0000000-0000-4000-8000-000000000003'::uuid, null, null,
     '{"work_description":"Se instalaron contactos nuevos (ejemplo)"}'),
    ('b0000000-0000-4000-8000-000000000015'::uuid, 'validated'::public.event_type,
     now() - interval '18 days', 'a0000000-0000-4000-8000-000000000002'::uuid, null, null, '{}')
  ) as v (ticket_id, type, occurred_at, actor, reason_name, tech_name, payload)
  left join public.reasons r on r.name = v.reason_name
  left join public.technicians t on t.full_name = v.tech_name
  order by v.occurred_at;

  -- Asignaciones (cadena supervisor → técnico). Abiertas mientras el tiquet sigue activo.
  insert into public.ticket_assignments (
    ticket_id, cycle, stage, assignee_user_id, assignee_technician_id, assigned_by, assigned_at, ended_at)
  select v.ticket_id, 1, v.stage, v.assignee_user, tech.id,
         'a0000000-0000-4000-8000-000000000002', v.assigned_at, v.ended_at
  from (values
    ('b0000000-0000-4000-8000-000000000002'::uuid, 'supervisor'::public.assignment_stage,
     'a0000000-0000-4000-8000-000000000002'::uuid, null::text,
     now() - interval '20 hours', null::timestamptz),
    ('b0000000-0000-4000-8000-000000000003'::uuid, 'supervisor'::public.assignment_stage,
     'a0000000-0000-4000-8000-000000000002'::uuid, null, now() - interval '1 day 20 hours', null),
    ('b0000000-0000-4000-8000-000000000003'::uuid, 'technician'::public.assignment_stage,
     null, 'Luis Gómez (ejemplo)', now() - interval '1 day 12 hours', null),
    ('b0000000-0000-4000-8000-000000000004'::uuid, 'supervisor'::public.assignment_stage,
     'a0000000-0000-4000-8000-000000000002'::uuid, null, now() - interval '2 days 23 hours', null),
    ('b0000000-0000-4000-8000-000000000004'::uuid, 'technician'::public.assignment_stage,
     null, 'Luis Gómez (ejemplo)', now() - interval '2 days 22 hours', null),
    ('b0000000-0000-4000-8000-000000000005'::uuid, 'supervisor'::public.assignment_stage,
     'a0000000-0000-4000-8000-000000000002'::uuid, null, now() - interval '3 days 23 hours', null),
    ('b0000000-0000-4000-8000-000000000005'::uuid, 'technician'::public.assignment_stage,
     null, 'Luis Gómez (ejemplo)', now() - interval '3 days 22 hours', null),
    ('b0000000-0000-4000-8000-000000000006'::uuid, 'supervisor'::public.assignment_stage,
     'a0000000-0000-4000-8000-000000000002'::uuid, null, now() - interval '4 days 23 hours', null),
    ('b0000000-0000-4000-8000-000000000006'::uuid, 'technician'::public.assignment_stage,
     null, 'Luis Gómez (ejemplo)', now() - interval '4 days 22 hours', now() - interval '4 days'),
    ('b0000000-0000-4000-8000-000000000007'::uuid, 'supervisor'::public.assignment_stage,
     'a0000000-0000-4000-8000-000000000002'::uuid, null, now() - interval '7 days 23 hours', null),
    ('b0000000-0000-4000-8000-000000000007'::uuid, 'technician'::public.assignment_stage,
     null, 'Luis Gómez (ejemplo)', now() - interval '7 days 22 hours', now() - interval '7 days'),
    ('b0000000-0000-4000-8000-000000000008'::uuid, 'supervisor'::public.assignment_stage,
     'a0000000-0000-4000-8000-000000000002'::uuid, null, now() - interval '11 days 23 hours', null),
    ('b0000000-0000-4000-8000-000000000008'::uuid, 'technician'::public.assignment_stage,
     null, 'Luis Gómez (ejemplo)', now() - interval '11 days 22 hours', now() - interval '11 days'),
    ('b0000000-0000-4000-8000-000000000009'::uuid, 'supervisor'::public.assignment_stage,
     'a0000000-0000-4000-8000-000000000002'::uuid, null, now() - interval '5 days 23 hours', null),
    ('b0000000-0000-4000-8000-000000000009'::uuid, 'technician'::public.assignment_stage,
     null, 'Luis Gómez (ejemplo)', now() - interval '5 days 22 hours', now() - interval '5 days 12 hours'),
    ('b0000000-0000-4000-8000-000000000013'::uuid, 'supervisor'::public.assignment_stage,
     'a0000000-0000-4000-8000-000000000002'::uuid, null, now() - interval '1 day 10 hours', null),
    ('b0000000-0000-4000-8000-000000000013'::uuid, 'technician'::public.assignment_stage,
     null, 'Marta Ruiz (ejemplo)', now() - interval '1 day', null)
  ) as v (ticket_id, stage, assignee_user, tech_name, assigned_at, ended_at)
  left join public.technicians tech on tech.full_name = v.tech_name;

  -- Participación (líder) para medir horas por técnico.
  insert into public.ticket_participants (
    ticket_id, cycle, technician_id, participation_type, category_id, started_at, ended_at)
  select v.ticket_id, 1, tech.id, 'leader', cat.id, v.started_at, v.ended_at
  from (values
    ('b0000000-0000-4000-8000-000000000003'::uuid, 'Luis Gómez (ejemplo)', 'Plomería (ejemplo)', now() - interval '1 day 12 hours', null::timestamptz),
    ('b0000000-0000-4000-8000-000000000004'::uuid, 'Luis Gómez (ejemplo)', 'Eléctrico (ejemplo)', now() - interval '2 days 22 hours', null),
    ('b0000000-0000-4000-8000-000000000005'::uuid, 'Luis Gómez (ejemplo)', 'Eléctrico (ejemplo)', now() - interval '3 days 22 hours', null),
    ('b0000000-0000-4000-8000-000000000006'::uuid, 'Luis Gómez (ejemplo)', 'Eléctrico (ejemplo)', now() - interval '4 days 22 hours', now() - interval '4 days'),
    ('b0000000-0000-4000-8000-000000000007'::uuid, 'Luis Gómez (ejemplo)', 'Eléctrico (ejemplo)', now() - interval '7 days 22 hours', now() - interval '7 days'),
    ('b0000000-0000-4000-8000-000000000008'::uuid, 'Luis Gómez (ejemplo)', 'Plomería (ejemplo)', now() - interval '11 days 22 hours', now() - interval '11 days'),
    ('b0000000-0000-4000-8000-000000000009'::uuid, 'Luis Gómez (ejemplo)', 'Eléctrico (ejemplo)', now() - interval '5 days 22 hours', now() - interval '5 days 12 hours'),
    ('b0000000-0000-4000-8000-000000000013'::uuid, 'Marta Ruiz (ejemplo)', 'Plomería (ejemplo)', now() - interval '1 day', null),
    ('b0000000-0000-4000-8000-000000000015'::uuid, 'Luis Gómez (ejemplo)', 'Eléctrico (ejemplo)', now() - interval '19 days 22 hours', now() - interval '19 days 12 hours')
  ) as v (ticket_id, tech_name, category, started_at, ended_at)
  join public.technicians tech on tech.full_name = v.tech_name
  join public.categories cat on cat.name = v.category;

  -- Ofertas al supervisor demo (bandeja de ofertas). Una pendiente y una tomada.
  insert into public.ticket_offers (
    ticket_id, cycle, supervisor_user_id, status, offered_at, resolved_at)
  values
    ('b0000000-0000-4000-8000-000000000001', 1, 'a0000000-0000-4000-8000-000000000002',
     'offered', now() - interval '2 hours', null),
    ('b0000000-0000-4000-8000-000000000002', 1, 'a0000000-0000-4000-8000-000000000002',
     'taken', now() - interval '1 day', now() - interval '20 hours')
  on conflict do nothing;

  -- Pausas cerradas y abiertas (métricas de pausas por motivo).
  insert into public.ticket_pauses (
    ticket_id, cycle, reason_id, opened_by, opened_at, closed_at)
  select v.ticket_id, 1, r.id, 'a0000000-0000-4000-8000-000000000003',
         v.opened_at, v.closed_at
  from (values
    ('b0000000-0000-4000-8000-000000000005'::uuid, 'Falta de material (ejemplo)',
     now() - interval '2 days', null::timestamptz),
    ('b0000000-0000-4000-8000-000000000007'::uuid, 'Falta de material (ejemplo)',
     now() - interval '7 days 12 hours', now() - interval '7 days 8 hours')
  ) as v (ticket_id, reason_name, opened_at, closed_at)
  join public.reasons r on r.name = v.reason_name;

  -- Calificaciones de satisfacción en tiquets cerrados.
  insert into public.ticket_ratings (ticket_id, score, comment, rated_by, requester_id)
  select v.ticket_id, v.score, v.comment,
         'a0000000-0000-4000-8000-000000000004',
         (select id from public.requesters where full_name = 'Ana Pérez (ejemplo)')
  from (values
    ('b0000000-0000-4000-8000-000000000007'::uuid, 5::smallint, 'Resuelto muy rápido (ejemplo)'),
    ('b0000000-0000-4000-8000-000000000008'::uuid, 3::smallint, 'Tardó un poco (ejemplo)'),
    ('b0000000-0000-4000-8000-000000000015'::uuid, 4::smallint, 'Buen trabajo (ejemplo)')
  ) as v (ticket_id, score, comment);

  -- Evidencias (solo metadatos; sin archivo en Storage).
  insert into public.evidence (
    ticket_id, cycle, type, storage_path, mime_type, size_bytes,
    captured_by_technician_id, captured_by_user_id, uploaded_by, occurred_at)
  select v.ticket_id, 1, v.type, null, 'image/jpeg', v.size_bytes,
         tech.id, 'a0000000-0000-4000-8000-000000000003',
         'a0000000-0000-4000-8000-000000000003', v.occurred_at
  from (values
    ('b0000000-0000-4000-8000-000000000001'::uuid, 'request'::public.evidence_type, now() - interval '2 hours', 120000::bigint, null::text),
    ('b0000000-0000-4000-8000-000000000004'::uuid, 'before'::public.evidence_type, now() - interval '2 days 19 hours', 180000, 'Luis Gómez (ejemplo)'),
    ('b0000000-0000-4000-8000-000000000005'::uuid, 'before'::public.evidence_type, now() - interval '3 days 21 hours', 175000, 'Luis Gómez (ejemplo)'),
    ('b0000000-0000-4000-8000-000000000006'::uuid, 'before'::public.evidence_type, now() - interval '4 days 21 hours', 160000, 'Luis Gómez (ejemplo)'),
    ('b0000000-0000-4000-8000-000000000006'::uuid, 'after'::public.evidence_type, now() - interval '4 days 1 hour', 165000, 'Luis Gómez (ejemplo)'),
    ('b0000000-0000-4000-8000-000000000007'::uuid, 'before'::public.evidence_type, now() - interval '7 days 21 hours', 200000, 'Luis Gómez (ejemplo)'),
    ('b0000000-0000-4000-8000-000000000007'::uuid, 'after'::public.evidence_type, now() - interval '7 days 1 hour', 210000, 'Luis Gómez (ejemplo)'),
    ('b0000000-0000-4000-8000-000000000008'::uuid, 'before'::public.evidence_type, now() - interval '11 days 21 hours', 140000, 'Luis Gómez (ejemplo)'),
    ('b0000000-0000-4000-8000-000000000008'::uuid, 'after'::public.evidence_type, now() - interval '11 days 1 hour', 145000, 'Luis Gómez (ejemplo)'),
    ('b0000000-0000-4000-8000-000000000009'::uuid, 'before'::public.evidence_type, now() - interval '5 days 21 hours', 155000, 'Luis Gómez (ejemplo)'),
    ('b0000000-0000-4000-8000-000000000009'::uuid, 'after'::public.evidence_type, now() - interval '5 days 13 hours', 158000, 'Luis Gómez (ejemplo)'),
    ('b0000000-0000-4000-8000-000000000012'::uuid, 'request'::public.evidence_type, now() - interval '7 days', 130000, null),
    ('b0000000-0000-4000-8000-000000000015'::uuid, 'before'::public.evidence_type, now() - interval '19 days 21 hours', 170000, 'Luis Gómez (ejemplo)'),
    ('b0000000-0000-4000-8000-000000000015'::uuid, 'after'::public.evidence_type, now() - interval '19 days 13 hours', 172000, 'Luis Gómez (ejemplo)')
  ) as v (ticket_id, type, occurred_at, size_bytes, tech_name)
  left join public.technicians tech on tech.full_name = v.tech_name;

  -- Enlace del duplicado.
  insert into public.ticket_links (ticket_id, linked_ticket_id, link_type, created_by)
  values ('b0000000-0000-4000-8000-000000000012', 'b0000000-0000-4000-8000-000000000007',
          'duplicate_of', 'a0000000-0000-4000-8000-000000000002')
  on conflict do nothing;
end $$;
