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
| Supervisor | Ruteo, asignación, pausas, validación, reclamaciones, prioridad y tiempos manuales |
| Técnico | Trabajo asignado, inicio, pausa, atención y recaptura |
| Administrador | Todos los permisos y la administración de la instancia |

## Permisos

| Grupo | Permisos |
|---|---|
| Tiquets | `ticket.create`, `ticket.create_on_behalf`, `ticket.view`, `ticket.take_offer`, `ticket.assign_supervisor`, `ticket.assign_technician`, `ticket.add_auxiliary`, `ticket.recapture`, `ticket.start`, `ticket.attend`, `ticket.pause`, `ticket.resume`, `ticket.validate`, `ticket.validate_on_behalf`, `ticket.open_claim`, `ticket.open_claim_on_behalf`, `ticket.resolve_claim`, `ticket.reopen`, `ticket.reject`, `ticket.cancel`, `ticket.cancel_on_behalf`, `ticket.mark_duplicate`, `ticket.reactivate`, `ticket.prioritize`, `ticket.rate`, `ticket.rate_on_behalf`, `ticket.record_progress` |
| Tiempo | `time.record_manual` |
| Evidencia | `evidence.attach` |
| Métricas | `metrics.view` |
| Datos | `data.import` |
| Administración | `act_on_behalf`, `catalog.manage`, `user.manage`, `role.manage`, `assignment.manage` |

La comprobación se realiza en el servidor con `can` y `canAct`. Un tiquet fuera de alcance devuelve
404; un permiso ausente devuelve 403.
