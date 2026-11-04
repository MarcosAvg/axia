# API

La web habla con `/api` en el mismo origen. La API usa JSON, cookie de sesión opaca y validación
de origen para escrituras; no expone una clave de base de datos al cliente. Las comprobaciones de
[Permisos](permisos.md) también se aplican a las lecturas y agregados.

## Contratos comunes

- UUID para identificadores de recursos y `clientRequestId`; fechas de acción en formato ISO con
  zona (`occurredAt`). Los esquemas validan entradas antes de ejecutar servicios.
- Alta, acciones y reserva de evidencia son idempotentes. Conserva `clientRequestId` al reintentar.
  El alta devuelve `{ ticket: { id, folio, possibleDuplicate }, replayed }`: 201 al crear, 200 al
  repetir. Una acción devuelve `{ ticketId, action, replayed }`.
- Listas de tiquets: `page` desde 1 (por defecto 1), `pageSize` entre 1 y 100 (por defecto 20).
  Filtros: `status` o `statuses` separados por coma, `buildingId`, `categoryId`, `search`.
- Error JSON: `{ error: { code, message, details? }, requestId }`. Usa el código para decidir el
  tratamiento y el mensaje para informar; los errores de campos incluyen detalles de validación.
- Respuestas habituales: 400 datos inválidos, 401 sesión requerida, 403 permiso insuficiente,
  404 recurso inexistente o no visible, 409 conflicto de estado o precondiciones, 429 límite de
  intentos. Un UUID repetido no sustituye los controles de sesión y alcance.

## Salud y arranque

| Método | Ruta | Uso |
|---|---|---|
| `GET` | `/api/health/live` | Proceso vivo |
| `GET` | `/api/health/ready` | Base disponible |
| `GET` | `/api/setup/status` | Indica si falta el primer administrador |
| `POST` | `/api/setup` | Crea el primer administrador |

## Sesión

| Método | Ruta | Uso |
|---|---|---|
| `POST` | `/api/auth/login` | Inicio de sesión |
| `POST` | `/api/auth/logout` | Cierre de sesión |
| `GET` | `/api/auth/me` | Identidad, roles, permisos y perfil de técnico |
| `PATCH` | `/api/auth/profile` | Nombre y teléfono propios |
| `POST` | `/api/auth/change-password` | Cambio de contraseña |

## Tiquets

| Método | Ruta | Uso |
|---|---|---|
| `GET` | `/api/tickets` | Lista paginada con filtros |
| `POST` | `/api/tickets` | Alta idempotente |
| `POST` | `/api/tickets/duplicates` | Aviso previo de posibles duplicados |
| `GET` | `/api/tickets/:id/duplicate-alerts` | Alertas de duplicado con su decisión |
| `POST` | `/api/tickets/:id/duplicate-alerts/dismiss` | Descartar las alertas pendientes |
| `GET` | `/api/tickets/mine` | Bandeja del técnico |
| `GET` | `/api/tickets/offers` | Ofertas del supervisor |
| `GET` | `/api/supervisors` | Supervisores con ámbito |
| `GET` | `/api/tickets/:id` | Detalle |
| `GET` | `/api/tickets/:id/timeline` | Historial |
| `GET` | `/api/tickets/:id/participants` | Participantes |
| `GET` | `/api/tickets/:id/pause-state` | Pausa abierta |
| `GET` | `/api/tickets/:id/pause-steps` | Subestados de pausa |
| `GET` | `/api/tickets/:id/rating` | Calificación |
| `PATCH` | `/api/tickets/:id/events/:eventId/time` | Ajustar la hora de una acción |
| `POST` | `/api/tickets/:id/actions` | Acciones de flujo |

El cuerpo de una acción contiene `action`, `clientRequestId` y los campos específicos del comando.
Los comandos y sus precondiciones están en [Estados y transiciones](estados-y-transiciones.md).
Por ejemplo, iniciar envía `{ "action": "start", "clientRequestId": "<uuid>" }` después de subir la
evidencia del ciclo. La API no permite escribir directamente el estado.

El detalle del tiquet incluye `isRequester`, `requesterValidated`, `hasTaken`, `requesterId`,
`requesterDependencyId`, `requesterDependencyName` y `validationPolicy` para que la interfaz ajuste
las acciones, la calificación y la recaptura. `rate` acepta un tiquet `closed` o uno `attended` con
validación del solicitante; una segunda calificación del mismo tiquet responde 409. Validar dos
veces el mismo rol en el ciclo también responde 409. `open_claim` responde 409 cuando lo intenta el
solicitante que ya validó su lado, incluso después del cierre.

`validate`, `rate`, `open_claim` y `cancel` aceptan `subjectRequesterId`. Si viene, debe ser el
solicitante del tiquet y exige el permiso `*_on_behalf` correspondiente; la acción se registra a su
nombre. Si falta, la acción es propia: validar registra el lado del supervisor y exige que el
solicitante ya haya validado en política `both` (409 si no), calificar solo lo puede hacer el propio
solicitante (403 para un supervisor sin proxy) y reclamar o cancelar se atribuyen al actor.

Un supervisor sin asignación abierta como titular no puede asignar, reasignar, recapturar, rechazar,
cancelar, cambiar prioridad ni marcar duplicado sobre un tiquet `registered`; primero debe enviar
`take`. El administrador conserva la cola de tiquets sin ruteo y puede asignar desde `registered`.

La línea de tiempo expone `subjectUserName`, `subjectTechnicianName` y `subjectRequesterName`. El
actor es quien ejecuta; el sujeto es la persona a la que se atribuye la acción y el tiempo. En
validación `both`, el solicitante valida primero y el supervisor después. Un supervisor sin proxy
que intenta validar antes de ese lado recibe 409; con `subjectRequesterId` registra el lado del
solicitante. Reclamar o cancelar sin proxy se atribuye al actor, no al solicitante.

El alta de tiquet, las acciones y la reserva de evidencia aceptan `occurredAt` para registrar la
hora real. En las acciones solo se acepta junto con `subjectTechnicianId`, para las acciones de
técnico ejecutadas por proxy (`start`, `pause`, `advance_pause`, `resume`, `attend`, `recapture`).
En el alta solo se acepta cuando el tiquet se registra a nombre de otra persona. El ajuste de un
evento valida que la nueva hora quede entre el evento anterior y el siguiente, deja auditoría y
reconstruye los tramos del tiquet. En la sincronización offline, `manualTime: true` exige permiso
para ajustar horas y un sujeto válido, y aplica las mismas validaciones.

Si el solicitante del alta tiene dependencia, `dependencyId` debe ser esa dependencia y la
`locationId` debe estar vinculada a ella; si no coincide, la API responde 400. En `recapture` la
misma regla se aplica a la dependencia del solicitante del tiquet cuando el cambio incluye
edificio, ubicación o dependencia; los cambios solo de texto siguen permitidos para tiquets
históricos.

## Catálogos y evidencias

| Método | Ruta | Uso |
|---|---|---|
| `GET` | `/api/catalogs/:catalog` | Catálogos de lectura |
| `GET` | `/api/catalogs/buildings?dependencyId=…` | Edificios con ubicaciones de la dependencia |
| `GET` | `/api/catalogs/locations?buildingId=…&dependencyId=…` | Ubicaciones del edificio vinculadas a la dependencia |
| `GET` | `/api/catalogs/dependencies?locationId=…` | Dependencias vinculadas a la ubicación |
| `POST` | `/api/tickets/:id/evidence` | Reservar evidencia y obtener URL TUS |
| `GET` | `/api/tickets/:id/evidence` | Listar evidencias |
| `GET` | `/api/evidence/:id/file` | Archivo autenticado |
| `GET` | `/api/evidence/:id/thumbnail` | Miniatura autenticada |
| `POST` | `/api/uploads` | Subida TUS |

Los archivos y miniaturas requieren sesión y acceso al tiquet en cada lectura: sus rutas son
autenticadas, no URLs firmadas públicas. La reserva devuelve
`{ evidence: { id }, uploadUrl, maxSize, quotaRemaining, replayed }`. El cliente sube al `uploadUrl`
con el protocolo TUS; reservar por sí solo no completa la evidencia. El servidor aplica límites
de tamaño, tipo y cuota, y procesa imágenes antes de dejarlas disponibles.

## Tiempo real y sincronización

| Método | Ruta | Uso |
|---|---|---|
| `GET` | `/api/events` | SSE de eventos |
| `GET` | `/api/events/changes` | Eventos perdidos desde `since` |
| `GET` | `/api/notifications` | Bandeja |
| `GET` | `/api/notifications/unread-count` | No leídas |
| `POST` | `/api/notifications/:id/read` | Marcar una |
| `POST` | `/api/notifications/read-all` | Marcar todas |
| `POST` | `/api/sync/actions` | Lote de acciones offline |

`GET /api/notifications` devuelve, por aviso, `ticketId`, `ticketFolio`, `type`, `payload`, `readAt`
y `createdAt`.

`GET /api/events/changes` recibe `since` (ID numérico del último evento, por defecto 0) y `limit`
(1–200, por defecto 100); devuelve `{ items }` en orden por ID. SSE y recuperación respetan alcance
y visibilidad de eventos para solicitantes. SSE se cierra al expirar o revocar la sesión.

La sincronización recibe `{ items: [...] }` (1–100). Cada elemento lleva `clientRequestId`,
`ticketId`, `type` (comando), `args`, `occurredAt` y `manualTime` opcional. Devuelve `{ results }`
con estado por envío: `applied`, `duplicate`, `rejected`, `conflict` o `blocked`, y código/mensaje
cuando corresponde. Una acción fallida bloquea las siguientes del mismo tiquet en el lote
(`blockedBy`), sin detener otros tiquets. Valida antigüedad, tolerancia de futuro, permisos y estado;
no existe aceptación automática por haber trabajado sin conexión. El registro histórico de una
acción tardía rechazada sigue [pendiente](estados-y-transiciones.md).

## Administración

| Método | Ruta | Uso |
|---|---|---|
| `GET/POST/PATCH/DELETE` | `/api/admin/users` / `/api/admin/users/:id` | Usuarios; `DELETE` borra o archiva |
| `POST` | `/api/admin/users/:id/reset-password` | Restablecer contraseña |
| `POST` | `/api/admin/users/:id/revoke-sessions` | Revocar sesiones |
| `GET` | `/api/admin/roles` | Roles |
| `GET` | `/api/admin/access` | Inventario de acceso |
| `POST/PATCH` | `/api/admin/access/roles` y `/:id` | Crear y actualizar roles |
| `POST` | `/api/admin/access/role-permissions` y `/remove` | Conceder y retirar permisos |
| `POST` | `/api/admin/access/user-roles` y `/remove` | Conceder y retirar roles |
| `PATCH` | `/api/admin/access/profiles/:id` | Actualizar perfil |
| `PATCH` | `/api/admin/access/requesters/:id`, `/api/admin/access/technicians/:id` | Vincular cuenta y persona del catálogo |
| `POST/DELETE` | `/api/admin/access/scopes` y `/:id` | Ámbitos de supervisor |
| `POST/DELETE` | `/api/admin/access/scope-buildings` y `/:scopeId/:buildingId` | Edificios del ámbito |
| `POST/DELETE` | `/api/admin/access/technician-categories` y `/:technicianId/:categoryId` | Designaciones |
| `GET` | `/api/admin/catalogs/:table?orderBy=…` | Catálogos con datos derivados: conteos, ruta de motivos y cuenta vinculada |
| `POST/PATCH/DELETE` | `/api/admin/catalogs/:table` y `/:id` | Alta, edición y borrado de catálogos sin uso (si están en uso responde 409) |
| `POST/PATCH` | `/api/admin/catalogs/dependencies` y `/:id` | Dependencia con al menos una ubicación |
| `GET` | `/api/admin/catalogs/dependencies/locations` | Vínculos dependencia–ubicación |
| `GET` | `/api/admin/catalogs/dependencies/:id/locations` | Ubicaciones de una dependencia |
| `GET/POST/PATCH` | `/api/admin/calendars` y `/:id` | Calendarios |
| `POST` | `/api/admin/calendars/:id/intervals`, `/:id/holidays` | Añadir franjas y festivos |
| `DELETE` | `/api/admin/calendar-intervals/:id`, `/api/admin/calendar-holidays/:id` | Retirar franjas y festivos |
| `GET/PATCH` | `/api/admin/settings` | Configuración de instancia |

## Indicadores

| Método | Ruta |
|---|---|
| `GET` | `/api/metrics/summary` |
| `GET` | `/api/dashboard/activity` |
| `GET` | `/api/metrics/pauses` |
| `GET` | `/api/metrics/duplicate-tickets` |
| `GET` | `/api/metrics/duplicate-alerts` |
| `GET` | `/api/metrics/duplicates-by-dimension` |
| `GET` | `/api/metrics/satisfaction` |
| `GET` | `/api/metrics/sla` |
| `GET` | `/api/metrics/sla-by-priority` |
| `GET` | `/api/metrics/by-technician` |
| `GET` | `/api/metrics/technician-times` |
| `GET` | `/api/metrics/technician-subject-times` |
| `GET` | `/api/metrics/requester-times` |
| `GET` | `/api/metrics/supervisors` |
| `GET` | `/api/metrics/pause-substates` |
| `GET` | `/api/metrics/reject-cancel` |
| `GET` | `/api/metrics/routing` |

Resumen y actividad requieren `ticket.view`; las demás métricas requieren `metrics.view` y usan
su alcance. Los filtros de métricas son `from` y `to` (`YYYY-MM-DD`), `buildingId`, `teamId`,
`categoryId` y `dependencyId`; un filtro nunca amplía el alcance. Resumen admite `compact=0|1`;
actividad admite `limit` (1–50, por defecto 8). Las rutas de métricas por grupo devuelven `{ items }`.

Los contratos ejecutables están junto a las rutas y en `apps/server/src/**/schemas.ts`;
las pruebas de integración verifican formas, permisos y casos de error. Esta referencia no es un
SDK ni sustituye esos esquemas.
