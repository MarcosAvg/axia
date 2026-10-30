# Datos

Referencia conceptual del modelo de datos actual. El esquema ejecutable está en
`apps/server/src/db/schema.ts` y las migraciones en `apps/server/db/migrations/`.

## Dominios

| Dominio | Tablas principales |
|---|---|
| Identidad | `users`, `sessions`, `login_attempts`, `roles`, `permissions`, `user_roles` |
| Catálogos | `teams`, `buildings`, `locations`, `dependencies`, `categories`, `subcategories`, `problems`, `service_types`, `priorities`, `channels` |
| Personas | `requesters`, `technicians`, `technician_categories`, `supervisor_scopes`, `supervisor_scope_buildings` |
| Tiquets | `tickets`, `ticket_events`, `ticket_assignments`, `ticket_participants`, `ticket_offers` |
| Flujo | `ticket_pauses`, `ticket_pause_steps`, `ticket_captures`, `ticket_claims`, `ticket_links`, `ticket_ratings`, `ticket_validations` |
| Tiempo | `time_spans`, `work_calendars`, `work_calendar_intervals`, `work_calendar_holidays` |
| Evidencia | `evidence` y el volumen privado de archivos |
| Notificaciones | `notification_rules`, `notifications`, `notification_deliveries`, `push_subscriptions` |
| Importación | `ticket_external_refs`, `catalog_import_*`, `import_*`; adaptadores deshabilitados |
| Configuración | `instance_settings`, `reasons`, `escalation_rules` |

## Relaciones clave

- Un tiquet pertenece a un edificio, ubicación, dependencia, categoría, subcategoría, problema y
  prioridad. El equipo se deriva del problema.
- El problema pertenece a un equipo (`problems.team_id`); la categoría ya no tiene equipo.
- Una dependencia se vincula a una o varias ubicaciones (`dependency_locations`); una ubicación
  puede tener varias dependencias. El vínculo es obligatorio: una dependencia sin ubicación no es
  válida.
- Un tiquet puede tener tipo de servicio; la subcategoría y el problema son obligatorios.
- El solicitante puede tener cuenta o existir solo en el catálogo.
- El técnico puede tener cuenta o existir solo en el catálogo.
- Las asignaciones y participantes conservan el histórico con `ended_at`.
- Cada cambio de estado genera un evento con actor, sujeto, motivo y hora.

## Reglas

- Los catálogos se desactivan; no se borran.
- El tiquet conserva una instantánea de los valores usados.
- El folio es inmutable y único.
- `ticket_events` es de solo agregar.
- Las claves foráneas protegen la integridad; los índices se añaden después de medir.
- Las vistas de métricas no aplican autorización por sí mismas: la API aplica el alcance.

El diseño histórico de la primera fase está en
[`../history/modelo-datos-fase-1.md`](../history/modelo-datos-fase-1.md).
