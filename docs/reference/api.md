# API

La API es HTTP/JSON, con cookie de sesión y validación de origen. Las rutas de escritura y lectura de
tiquets respetan permisos y alcance. Un recurso fuera de alcance responde 404.

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
| `POST` | `/api/tickets/duplicates` | Posibles duplicados |
| `GET` | `/api/tickets/mine` | Bandeja del técnico |
| `GET` | `/api/tickets/offers` | Ofertas del supervisor |
| `GET` | `/api/supervisors` | Supervisores con ámbito |
| `GET` | `/api/tickets/:id` | Detalle |
| `GET` | `/api/tickets/:id/timeline` | Historial |
| `GET` | `/api/tickets/:id/participants` | Participantes |
| `GET` | `/api/tickets/:id/pause-state` | Pausa abierta |
| `GET` | `/api/tickets/:id/pause-steps` | Subestados de pausa |
| `GET` | `/api/tickets/:id/rating` | Calificación |
| `GET` | `/api/tickets/:id/manual-time` | Tramos manuales y tramo abierto |
| `POST` | `/api/tickets/:id/manual-time` | Registrar o corregir un tramo manual |
| `POST` | `/api/tickets/:id/manual-time/:spanId/void` | Anular tramo manual |
| `POST` | `/api/tickets/:id/actions` | Acciones de flujo |

Las acciones de flujo son `take`, `assign_technician`, `assign_supervisor`, `add_auxiliary`,
`start`, `pause`, `advance_pause`, `resume`, `attend`, `validate`, `reject`, `cancel`,
`change_priority`, `comment`, `recapture`, `open_claim`, `resolve_claim`, `mark_duplicate`,
`reactivate` y `rate`.

`GET /api/tickets/:id/manual-time` devuelve `items`, el `context` con el tramo abierto y el técnico
sugerido. `POST` acepta `replacesSpanId` para corregir un tramo y admite `endedAt` vacío solo al
corregir un tramo que sigue abierto.

## Catálogos y evidencias

| Método | Ruta | Uso |
|---|---|---|
| `GET` | `/api/catalogs/:catalog` | Catálogos de lectura |
| `POST` | `/api/tickets/:id/evidence` | Reservar evidencia y obtener URL TUS |
| `GET` | `/api/tickets/:id/evidence` | Listar evidencias |
| `GET` | `/api/evidence/:id/file` | Archivo autenticado |
| `GET` | `/api/evidence/:id/thumbnail` | Miniatura autenticada |
| `POST` | `/api/uploads` | Subida TUS |

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

## Administración

| Método | Ruta | Uso |
|---|---|---|
| `GET/POST/PATCH` | `/api/admin/users` / `/api/admin/users/:id` | Usuarios |
| `POST` | `/api/admin/users/:id/reset-password` | Restablecer contraseña |
| `POST` | `/api/admin/users/:id/revoke-sessions` | Revocar sesiones |
| `GET` | `/api/admin/roles` | Roles |
| `GET/POST/PATCH` | `/api/admin/access` y rutas asociadas | Roles, permisos, vínculos y ámbitos |
| `GET/POST/PATCH` | `/api/admin/catalogs/:table` | Catálogos |
| `GET/POST/PATCH/DELETE` | `/api/admin/calendars` y rutas asociadas | Calendarios |
| `GET/PATCH` | `/api/admin/settings` | Configuración de instancia |

## Indicadores

| Método | Ruta |
|---|---|
| `GET` | `/api/metrics/tickets` |
| `GET` | `/api/dashboard/activity` |
| `GET` | `/api/metrics/pauses` |
| `GET` | `/api/metrics/duplicate-tickets` |
| `GET` | `/api/metrics/duplicate-alerts` |
| `GET` | `/api/metrics/duplicates-by-dimension` |
| `GET` | `/api/metrics/satisfaction` |
| `GET` | `/api/metrics/sla` |
| `GET` | `/api/metrics/sla-by-priority` |
| `GET` | `/api/metrics/by-technician` |
| `GET` | `/api/metrics/reject-cancel` |
| `GET` | `/api/metrics/routing` |

Los contratos concretos están en `apps/server/src/**/schemas.ts` y en las pruebas de integración.
