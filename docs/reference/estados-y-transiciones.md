# Estados y transiciones

Los estados son lógica fija del sistema. Solo se modifican mediante acciones del servidor.

## Estados

| Código | Etiqueta | Significado |
|---|---|---|
| `registered` | Registrado | Creado y ofrecido; nadie lo ha tomado |
| `with_supervisor` | Con supervisor | Tomado por un supervisor |
| `assigned` | Asignado | Técnico asignado; aún no inicia |
| `in_progress` | En proceso | Trabajo iniciado |
| `paused` | Pausado | No puede avanzar; lleva motivo y subestados |
| `attended` | Atendido | Trabajo terminado; pendiente de validación |
| `under_claim` | En reclamación | Reclamación abierta |
| `closed` | Cerrado | Validado y finalizado |
| `rejected` | Rechazado | Descartado con motivo |
| `cancelled` | Cancelado | Cancelado con motivo |
| `duplicate` | Duplicado | Repetido de otro; enlazado al original |

`rejected`, `cancelled` y `duplicate` son estados de descarte y admiten reactivación.

## Acciones principales

| Acción | Origen | Efecto |
|---|---|---|
| `take` | `registered` | `with_supervisor`; retira ofertas |
| `assign_technician` | `registered`, `with_supervisor`, `assigned` | `assigned` |
| `assign_supervisor` | Tiquet tomado | `registered` para el nuevo destinatario |
| `start` | `assigned` | `in_progress`; exige evidencia `before` |
| `pause` | `in_progress` | `paused`; exige motivo |
| `advance_pause` | `paused` | Cambia el subestado |
| `resume` | `paused` | `in_progress` |
| `attend` | `in_progress` | `attended`; exige evidencia `after` y descripción |
| `validate` | `attended` | `closed` si se cumple la política |
| `open_claim` | `attended` o `closed` en ventana | `under_claim` |
| `resolve_claim` | `under_claim` | Reabre, cierra o crea un tiquet derivado |
| `reject` | Varios | `rejected` |
| `cancel` | Varios | `cancelled` |
| `mark_duplicate` | Varios | `duplicate`; enlaza el original |
| `reactivate` | Descartados | Estado previo al descarte |
| `recapture` | Varios | Aplica cambios de captura y conserva versiones |
| `change_priority` | No final | Ajusta la prioridad |
| `rate` | `closed` | Calificación de 1 a 5 |

## Reglas

- Cada acción valida permiso, estado y precondiciones.
- La acción y el evento de historial se escriben en la misma transacción.
- La primera acción válida gana; las posteriores no cambian el estado.
- Toda acción lleva un UUID de cliente y es idempotente.
- El historial es inmutable: no se borra ni se edita.
- Las acciones sin conexión se reenvían con `occurredAt` y el mismo UUID.

El flujo completo, con ejemplos y tiempos, está en [`../guides/uso.md`](../guides/uso.md).
