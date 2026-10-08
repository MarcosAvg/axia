-- Semilla de datos ficticios de Axia. Se carga con `pnpm db:reset` y `supabase start`.

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
    -- Solicitante
    ('requester', 'ticket.create', 'own'),
    ('requester', 'ticket.view', 'own'),
    ('requester', 'ticket.validate', 'own'),
    ('requester', 'ticket.open_claim', 'own'),
    ('requester', 'ticket.cancel', 'own'),
    ('requester', 'ticket.mark_duplicate', 'own'),
    ('requester', 'ticket.rate', 'own'),
    -- Supervisor
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
    ('supervisor', 'act_on_behalf', 'team'),
    -- Técnico
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

-- Administrador: todos los permisos con ámbito total.
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

-- Reglas de escalamiento (semilla; el disparo programado llega después).
insert into public.escalation_rules (condition, threshold, notify) values
  ('untaken', interval '4 hours', 'administrators'),
  ('unassigned', interval '8 hours', 'supervisor'),
  ('no_candidate', interval '1 minute', 'administrators'),
  ('target_near', interval '30 minutes', 'supervisor'),
  ('target_overdue', interval '1 minute', 'supervisor')
on conflict do nothing;
