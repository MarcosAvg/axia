# Datos

Referencia conceptual del modelo de datos actual. La definición ejecutable completa está en las
migraciones SQL de `apps/server/db/migrations/`. Drizzle ejecuta SQL parametrizado y transacciones;
no se mantiene una segunda definición de tablas en TypeScript ([ADR 0100](../decisions/0100-consolidacion-interna.md)).

## Dominios

| Dominio | Tablas principales |
|---|---|
| Identidad | `users`, `sessions`, `login_attempts`, `roles`, `permissions`, `user_roles`, `role_permissions` |
| Catálogos | `teams`, `buildings`, `locations`, `dependencies`, `dependency_locations`, `categories`, `subcategories`, `problems`, `service_types`, `priorities`, `channels` |
| Personas | `requesters`, `technicians`, `technician_categories`, `supervisor_scopes`, `supervisor_scope_buildings` |
| Tiquets | `tickets`, `ticket_events`, `ticket_assignments`, `ticket_participants`, `ticket_offers` |
| Flujo | `ticket_pauses`, `ticket_pause_steps`, `ticket_captures`, `ticket_claims`, `ticket_links`, `ticket_ratings`, `ticket_validations` |
| Tiempo | `time_spans`, `work_calendars`, `work_calendar_intervals`, `work_calendar_holidays` |
| Evidencia | `evidence` y el volumen privado de archivos |
| Notificaciones | `notification_rules`, `notifications`, `notification_deliveries`, `push_subscriptions` |
| Referencias externas | `external_systems`, `ticket_external_refs`; sin adaptadores publicados |
| Configuración | `instance_settings`, `reasons`, `escalation_rules` |

## Relaciones clave

- Un tiquet pertenece a un edificio, ubicación, dependencia, categoría, subcategoría, problema y
  prioridad. El equipo se deriva del problema.
- El problema pertenece a un equipo (`problems.team_id`); la categoría ya no tiene equipo.
- Una dependencia se vincula a una o varias ubicaciones (`dependency_locations`); una ubicación
  puede tener varias dependencias. El vínculo es obligatorio: una dependencia sin ubicación no es
  válida.
- La API actual permite omitir el tipo de servicio; subcategoría y problema son obligatorios al
  registrar. Esto no cambia RN-01 de [Negocio](negocio.md), que exige tipo de servicio. La interfaz
  lo exige al marcar atendido; esa condición aún no es obligatoria en el contrato del servidor.
- El solicitante puede tener cuenta o existir solo en el catálogo.
- El técnico puede tener cuenta o existir solo en el catálogo.
- Las asignaciones y participantes conservan el histórico con `ended_at`.
- Cada cambio de estado genera un evento con actor, sujeto, motivo y hora. El sujeto puede ser
  usuario, técnico o solicitante; los tramos de `time_spans` guardan el mismo sujeto para atribuir
  el tiempo a la persona y no a quien ejecuta la acción.

## Reglas

- Los catálogos se desactivan; solo se borra un registro que nunca se usó.
- El tiquet conserva una instantánea de los valores usados.
- El folio es inmutable y único.
- `ticket_events` es de solo agregar.
- Las claves foráneas protegen la integridad; los índices se añaden después de medir.
- Las vistas de métricas no aplican autorización por sí mismas: la API aplica el alcance.

La migración `0017_remove_retired_objects.sql` retiró objetos sin consumidores; se conservaron las
referencias externas genéricas y sus claves. `push_subscriptions` y
`escalation_rules` siguen reservadas para funciones futuras; su presencia no implica Web Push ni
planificador activos.

El [índice histórico](../history/README.md) explica cómo consultar el diseño de la primera fase
en Git sin confundirlo con el esquema actual.
