# Permisos

Axia usa permisos fijos y roles configurables. Cada permiso se asigna a un rol con un ámbito.

## Ámbitos

| Ámbito | Alcance |
|---|---|
| `own` | Relación con el tiquet según el permiso; detalle debajo |
| `team` | Equipos del perfil técnico y de los ámbitos activos de supervisor |
| `buildings` | Equipos y edificios del ámbito de supervisor |
| `all` | Toda la instancia |

Cuando una cuenta tiene el mismo permiso por varios roles activos, se selecciona uno por este
orden: `all` > `buildings` > `team` > `own`. No se unen los resultados de distintos ámbitos.
`buildings` exige coincidencia tanto del equipo como del edificio.

Para `own`, el servidor distingue:

| Permiso | Relación requerida |
|---|---|
| `ticket.view` | Solicitante vinculado a la cuenta, técnico/auxiliar activo o supervisor asignado |
| `ticket.validate`, `ticket.open_claim`, `ticket.rate` | Solicitante vinculado a la cuenta |
| `ticket.start`, `ticket.attend`, `ticket.pause`, `ticket.resume`, `ticket.recapture`, `ticket.record_progress` | Técnico asignado o participante técnico activo |
| `ticket.cancel`, `ticket.reject`, `ticket.mark_duplicate` | Solicitante vinculado o técnico/participante activo |

Registrar a nombre de alguien no concede por sí solo visibilidad con `own`. Los permisos restantes
no adquieren alcance propio sobre un tiquet por el mero hecho de configurar `own`.

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
| Tiquets | `ticket.create`, `ticket.create_on_behalf`, `ticket.view`, `ticket.take_offer`, `ticket.assign_supervisor`, `ticket.assign_technician`, `ticket.add_auxiliary`, `ticket.recapture`, `ticket.start`, `ticket.attend`, `ticket.pause`, `ticket.resume`, `ticket.validate`, `ticket.validate_on_behalf`, `ticket.open_claim`, `ticket.resolve_claim`, `ticket.reject`, `ticket.cancel`, `ticket.mark_duplicate`, `ticket.reactivate`, `ticket.prioritize`, `ticket.rate`, `ticket.rate_on_behalf`, `ticket.record_progress` |
| Tiempo | `time.record_manual` (ajustar la hora de las acciones y fijar la hora al actuar por proxy) |
| Evidencia | `evidence.attach` |
| Métricas | `metrics.view` |
| Administración | `act_on_behalf`, `catalog.manage`, `user.manage`, `role.manage`, `assignment.manage` |

La comprobación se realiza en el servidor con `can`, `canAct` y consultas con alcance. Una acción
requiere primero poder ver el tiquet y después su permiso concreto. Un recurso no visible responde
404; la falta de autorización sobre un recurso visible responde 403. Estado, evidencia, plazo y
otras precondiciones pueden causar rechazo aunque exista el permiso. La semilla demo no evita
estas comprobaciones.

## Actuar a nombre de otra persona

Para acciones de técnico, `subjectTechnicianId` activa el control de `act_on_behalf`: con ámbito
`all` admite cualquier técnico activo; con `team`, técnicos de los equipos de la cuenta. El sujeto
debe participar en el tiquet, salvo en recaptura, cuyo servicio no exige participación. Otros ámbitos no habilitan este mecanismo. El actor debe poder ver el tiquet.

Sin sujeto se comprueba el permiso directo de la acción. `time.record_manual` no sustituye estos
controles: se exige además para fijar o ajustar la hora. Validar o calificar por el solicitante
usa los permisos específicos `ticket.validate_on_behalf` y `ticket.rate_on_behalf`; no basta con
`act_on_behalf`.

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

## Acceso a pantallas

El menú y las rutas combinan permisos y perfil; entrar por URL no evita el control.

| Pantalla | Requisito |
|---|---|
| Tiquets | `ticket.view`; resultados limitados por alcance |
| Mi trabajo | Perfil de técnico (`technicianId`) |
| Bandeja | `ticket.take_offer` |
| Métricas | `metrics.view` |
| Catálogos, calendarios y configuración | `catalog.manage` |
| Usuarios | `user.manage` |
| Roles | `role.manage` |
| Ámbitos y designaciones | `assignment.manage` |
| Perfil y avisos | Sesión activa |

Los roles semilla orientan la configuración inicial; una cuenta con un rol personalizado ve las
secciones permitidas por sus capacidades actuales. El [panel y las métricas de API](api.md)
aplican alcance incluso al calcular agregados.
