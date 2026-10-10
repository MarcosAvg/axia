-- Visibilidad de la línea de tiempo al solicitante (RN-23): amplía los tipos por
-- defecto con los cambios de estado relevantes (recaptura, reasignaciones y prioridad).
-- Las notas (`comment`) y la evidencia siguen siendo internas.

alter table public.instance_settings
  alter column requester_visible_event_types set default
  '{created,taken,assigned_technician,reassigned_supervisor,reassigned_technician,started,paused,resumed,attended,validated,priority_changed,capture_recaptured,claim_opened,claim_resolved,reopened,rejected,cancelled,duplicate_marked}';

-- Actualiza la fila existente solo si conserva el valor por defecto anterior
-- (no pisa una configuración ya personalizada).
update public.instance_settings
set requester_visible_event_types =
  '{created,taken,assigned_technician,reassigned_supervisor,reassigned_technician,started,paused,resumed,attended,validated,priority_changed,capture_recaptured,claim_opened,claim_resolved,reopened,rejected,cancelled,duplicate_marked}'
where requester_visible_event_types =
  '{created,taken,assigned_technician,started,paused,resumed,attended,validated,claim_opened,claim_resolved,reopened,rejected,cancelled,duplicate_marked}';
