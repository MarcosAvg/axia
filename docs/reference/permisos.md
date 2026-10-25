# Permisos

Axia usa permisos fijos y roles configurables. Cada permiso se asigna a un rol con un ámbito.

## Ámbitos

| Ámbito | Alcance |
|---|---|
| `own` | Tiquets propios o asignados, según el permiso |
| `team` | Tiquets del equipo |
| `buildings` | Equipos y edificios del ámbito de supervisor |
| `all` | Toda la instancia |

Cuando un usuario tiene el mismo permiso por varios roles, prevalece el ámbito más amplio.

## Roles semilla

| Rol | Enfoque |
|---|---|
| Solicitante | Crear y seguir sus tiquets, validar, reclamar, cancelar y calificar |
| Supervisor | Ruteo, asignación, pausas, validación, reclamaciones, prioridad y ajuste de horas de acciones |
| Técnico | Trabajo asignado, inicio, pausa, atención y recaptura |
| Administrador | Todos los permisos y la administración de la instancia |

## Permisos

| Grupo | Permisos |
|---|---|
| Tiquets | `ticket.create`, `ticket.create_on_behalf`, `ticket.view`, `ticket.take_offer`, `ticket.assign_supervisor`, `ticket.assign_technician`, `ticket.add_auxiliary`, `ticket.recapture`, `ticket.start`, `ticket.attend`, `ticket.pause`, `ticket.resume`, `ticket.validate`, `ticket.validate_on_behalf`, `ticket.open_claim`, `ticket.open_claim_on_behalf`, `ticket.resolve_claim`, `ticket.reopen`, `ticket.reject`, `ticket.cancel`, `ticket.cancel_on_behalf`, `ticket.mark_duplicate`, `ticket.reactivate`, `ticket.prioritize`, `ticket.rate`, `ticket.rate_on_behalf`, `ticket.record_progress` |
| Tiempo | `time.record_manual` (ajustar la hora de las acciones y fijar la hora al actuar por proxy) |
| Evidencia | `evidence.attach` |
| Métricas | `metrics.view` |
| Datos | `data.import` |
| Administración | `act_on_behalf`, `catalog.manage`, `user.manage`, `role.manage`, `assignment.manage` |

La comprobación se realiza en el servidor con `can` y `canAct`. Un tiquet fuera de alcance devuelve
404; un permiso ausente devuelve 403.

## Evidencia por tipo

La creación de evidencia se autoriza por el tipo y la acción que la justifica. `evidence.attach`
habilita cualquier tipo para quien lo tenga en el ámbito del tiquet.

| Tipo | Quién puede crearla |
|---|---|
| `request` | El solicitante o quien registró el tiquet, con `ticket.create` o `ticket.create_on_behalf`; o `evidence.attach` |
| `before`, `during`, `after` | `ticket.record_progress` sobre el tiquet; o `evidence.attach` |
| `claim` | `ticket.open_claim` sobre el tiquet; o `evidence.attach` |
| `other` | `evidence.attach` |

El solicitante puede adjuntar la foto de su solicitud y la evidencia de una reclamación sin recibir
`evidence.attach`; no puede adjuntar evidencias de trabajo ni “otras”.

## Vistas por rol

La navegación combina permisos con capacidades de la cuenta. Una vista oculta tampoco es accesible
por URL directa: muestra “Sin acceso”.

| Vista | Administrador | Supervisor | Técnico | Solicitante |
|---|---|---|---|---|
| Panel | Sí | Sí | Sí | Sí |
| Tiquets | Sí | Sí | Sí | Sí |
| Mi trabajo | Solo con perfil de técnico | Solo con perfil de técnico | Sí | No |
| Bandeja | Sí | Sí | No | No |
| Métricas | Sí | Sí | No | No |
| Administración | Según sus permisos | No | No | No |
| Mi perfil | Sí | Sí | Sí | Sí |
| Avisos | Campana | Campana | Campana | Campana |

“Mi trabajo” requiere `technicianId`; “Bandeja” requiere `ticket.take_offer`. Las secciones de
administración usan su permiso específico: `catalog.manage`, `user.manage`, `role.manage` o
`assignment.manage`. Un rol personalizado ve únicamente las tarjetas y destinos que puede abrir.
