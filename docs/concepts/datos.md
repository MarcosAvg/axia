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
| Tiempo | `time_spans`, `ticket_time_alerts`, `work_calendars`, `work_calendar_intervals`, `work_calendar_holidays` |
| Evidencia | `evidence` y el volumen privado de archivos |
| Adjuntos | `ticket_attachments` (documentos obligatorios de ciertos problemas) |
| Notificaciones | `notification_rules`, `notifications`, `notification_deliveries`, `push_subscriptions` |
| Configuración | `instance_settings`, `reasons`, `escalation_rules` |

## Relaciones clave

- Un tiquet pertenece a un edificio, ubicación, dependencia, categoría, subcategoría, problema y
  prioridad. El equipo se deriva del problema.
- El problema pertenece a un equipo (`problems.team_id`); la categoría ya no tiene equipo.
- Una dependencia se vincula a una o varias ubicaciones (`dependency_locations`); una ubicación
  puede tener varias dependencias. El vínculo es obligatorio: una dependencia sin ubicación no es
  válida. Si el solicitante tiene dependencia, el alta solo ofrece los edificios y ubicaciones
  vinculados a ella y el servidor rechaza una combinación fuera de ese ámbito (RN-31).
- La API actual permite omitir el tipo de servicio; subcategoría y problema son obligatorios al
  registrar. Esto no cambia RN-01 de [Negocio](negocio.md), que exige tipo de servicio. La interfaz
  lo exige al marcar atendido; esa condición aún no es obligatoria en el contrato del servidor.
- El solicitante puede tener cuenta o existir solo en el catálogo.
- El técnico puede tener cuenta o existir solo en el catálogo.
- Las asignaciones y participantes conservan el histórico con `ended_at`.
- Cada cambio de estado genera un evento con actor, sujeto, motivo y hora. El sujeto puede ser
  usuario, técnico o solicitante; los tramos de `time_spans` guardan el mismo sujeto para atribuir
  el tiempo a la persona y no a quien ejecuta la acción.
- `ticket_events` guarda la hora oficial (`occurred_at`), la hora de registro del servidor
  (`recorded_at`), la hora reportada por el dispositivo (`client_reported_at`, solo auditoría), el
  desfase medido (`client_clock_skew_ms`) y la confianza (`time_confidence`: `trusted`,
  `unverified` o `corrected`). `time_spans` copia la confianza y el calendario laboral del evento.
  `evidence` guarda `client_captured_at` y `time_confidence` con la misma semántica.
- `ticket_time_alerts` registra las alertas de desfase de reloj. Una alerta abierta bloquea los
  desenlaces finales del tiquet (`validate`, `reject`, `cancel`, `mark_duplicate`, `resolve_claim`)
  hasta que una persona con permiso corrija la hora.
- `time_spans` mantiene una sola fase primaria abierta por tiquet (`supervisor_response`,
  `pending_take`, `technician_assignment`, `wait_start`, `active_work`, `pause`, `validation` o
  `claim`). `reassignment`, `duplicate_review` y `dormant` son anotaciones: `dormant` cubre el
  tiempo fuera de atención y no suma en los indicadores de desempeño. `v_ticket_phase_coverage`
  verifica que la suma de fases primarias y `dormant` iguala el tiempo total.
- `v_ticket_metrics_base` incluye todos los estados y expone `outcome` (`open`, `closed`,
  `rejected`, `cancelled`, `duplicate`). Los indicadores de desempeño eligen su denominador: SLA,
  resolución y primera resolución solo usan cerrados; volumen y esfuerzo incluyen los demás
  desenlaces, salvo duplicados en carga.
- `ticket_offers.offer_round` distingue cada ruteo dentro del ciclo. Reasignar o recapturar agrega
  una ronda nueva sin reescribir las ofertas anteriores; `take` solo consume la oferta más reciente
  del ciclo vigente. Si un ruteo no produce candidatos, el evento `unrouted` deja constancia y la
  regla de notificación avisa a administración (RN-03).
- Un tiquet `registered` sin ofertas activas en su ciclo se expone como `isUnrouted` a quien puede
  coordinarlo. Un supervisor desactivado libera sus asignaciones y ofertas; si el trabajo aún no
  empezó, el tiquet vuelve a ruteo.

## Reglas

- Los catálogos se desactivan; solo se borra un registro que nunca se usó.
- El tiquet conserva una instantánea de los valores usados.
- El folio es inmutable y único.
- `ticket_events` es de solo agregar.
- Las claves foráneas protegen la integridad; los índices se añaden después de medir.
- Las vistas de métricas no aplican autorización por sí mismas: la API aplica el alcance.

Las migraciones `0017_remove_retired_objects.sql` y `0031_remove_external_refs.sql` retiraron
objetos sin consumidores; ya no se conservan referencias externas genéricas. `push_subscriptions` y
`escalation_rules` siguen reservadas para funciones futuras; su presencia no implica Web Push ni
planificador activos.

El [índice histórico](../history/README.md) explica cómo consultar el diseño de la primera fase
en Git sin confundirlo con el esquema actual.
