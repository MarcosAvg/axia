# Estados y transiciones

Referencia del comportamiento actual del servidor. Las reglas aprobadas permanecen en
[Negocio](../concepts/negocio.md); los límites de implementación se señalan al final.
La [guía de uso](../guides/uso.md) explica cómo ejecutar las acciones en pantalla.

## Estados

Los estados son fijos, no un catálogo editable.

| Código | Etiqueta | Significado |
|---|---|---|
| `registered` | Registrado | Creado, pendiente de tomar o asignar |
| `with_supervisor` | Con supervisor | A cargo de un supervisor |
| `assigned` | Asignado | Técnico asignado; aún no inicia |
| `in_progress` | En proceso | Trabajo iniciado |
| `paused` | Pausado | Espera con motivo y subestados |
| `attended` | Atendido | Trabajo terminado, pendiente de validación |
| `under_claim` | En reclamación | Reclamación abierta |
| `closed` | Cerrado | Atención finalizada |
| `rejected` | Rechazado | Descartado con motivo |
| `cancelled` | Cancelado | Cancelado con motivo |
| `duplicate` | Duplicado | Descartado y enlazado al original |

En la tabla siguiente, **no final** significa cualquier estado salvo `closed`, `rejected`,
`cancelled` y `duplicate`. **Descartado** comprende los tres últimos.

## Acciones

Todas exigen acceso al tiquet y autorización en el servidor. La referencia de
[Permisos](permisos.md) concentra quién tiene acceso; esta tabla concentra estados y condiciones.

| Acción | Origen | Condición y efecto |
|---|---|---|
| Registrar | — | Captura válida; crea `registered` y ofertas a supervisores candidatos |
| `take` | `registered` | Oferta activa; pasa a `with_supervisor` y retira otras ofertas |
| `assign_technician` | `registered`, `with_supervisor`, `assigned` | Técnico activo; pasa a `assigned`; reasignar exige motivo |
| `assign_supervisor` | `with_supervisor`, `assigned`, `in_progress`, `paused` | Titular o permiso de alcance global; motivo y destino; a un equipo pasa a `registered`, a un supervisor a `with_supervisor` |
| `add_auxiliary` | `assigned`, `in_progress`, `paused` | Técnico y motivo; agrega participación sin cambiar estado |
| `start` | `assigned` | Evidencia `before` del ciclo; pasa a `in_progress` |
| `pause` | `in_progress` | Motivo raíz activo con al menos un subestado activo; pasa a `paused` |
| `advance_pause` | `paused` | Motivo descendiente de la raíz de la pausa; registra otro paso |
| `resume` | `paused` | Subestado descendiente de la raíz obligatorio; cierra la pausa y pasa a `in_progress` |
| `attend` | `in_progress` | Evidencia `after` del ciclo y descripción del trabajo; pasa a `attended` |
| `validate` | `attended` | Registra el lado que corresponda; pasa a `closed` al cumplir la política de instancia |
| `open_claim` | `attended`, `closed` dentro de ventana | Motivo, descripción y evidencia `claim`; pasa a `under_claim` |
| `resolve_claim` | `under_claim` | `upheld`: nuevo ciclo en `assigned`; `dismissed`: `closed`; `new_ticket`: restaura estado anterior y crea derivado |
| `reject`, `cancel` | No final | Motivo del uso correspondiente; guarda estado previo y descarta |
| `mark_duplicate` | No final | Original distinto y existente; pasa a `duplicate` y enlaza |
| `reactivate` | Descartado | Motivo; restaura estado previo al descarte |
| `recapture` | `registered`, `with_supervisor`, `assigned` | Al menos un cambio; conserva versión; puede recalcular ruteo o devolver al supervisor |
| `change_priority` | Cualquiera | Prioridad válida; registra cambio sin transición |
| `comment` | Cualquiera | Texto de nota interna; sin transición |
| `rate` | `closed` | Puntuación de 1 a 5; opcional, sin transición |

**Registrar avance** es una acción de pantalla que agrega evidencia `during`; no es un comando
adicional de transición. Ajustar la hora de un evento tiene su propio endpoint en [API](api.md).

## Garantías y límites actuales

- Cada transición aceptada y su evento se escriben en una transacción. El historial es de solo
  agregar; los ajustes de hora dejan auditoría y reconstruyen tramos.
- Alta, acciones y reserva de evidencia usan un UUID del cliente. Repetir el mismo envío conserva
  su resultado; no debe generarse otro UUID para reintentar.
- Los envíos offline conservan hora y UUID; un fallo bloquea los siguientes del mismo tiquet.
  Actualmente el servidor devuelve conflicto o rechazo sin insertar un evento de acción tardía.
  El registro sin efecto exigido por RN-27 sigue pendiente.
- La recaptura actual no está disponible durante una reclamación, aunque RN-17 prevé corregir la
  captura al evaluarla. El motivo es opcional en su contrato actual.
- La reasignación directa a un supervisor termina en `with_supervisor`; RN-06 describe el regreso
  a `registered`. Esta diferencia no modifica la especificación aprobada.
- La validación automática tras N días es configurable, pero no hay un proceso que la ejecute.
  El cierre actual requiere las acciones de validación o resolución correspondientes.
- La interfaz calcula botones por permiso y estado; el servidor también valida ámbito,
  participación y ventana de reclamación. Un botón visible no garantiza que la acción se acepte.
