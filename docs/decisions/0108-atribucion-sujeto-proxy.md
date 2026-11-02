# 0108 — Atribución de tiempo y evidencia al sujeto proxy

**Fecha:** 2026-11-02
**Estado:** aceptada

## Decisión

El actor es solo auditoría. El tiempo, la evidencia y los eventos se atribuyen al **sujeto** de la
acción:

- Técnico con o sin cuenta: `subject_technician_id`.
- Solicitante con o sin cuenta: `subject_requester_id`.
- Supervisor o usuario: `subject_user_id`.

Los eventos y los tramos guardan como máximo un sujeto. En acciones de técnico sin proxy, el sujeto
sale del técnico vinculado al actor o, si no existe, del líder asignado; nunca del administrador o
supervisor que ejecuta. La evidencia de trabajo guarda al técnico sujeto en
`captured_by_technician_id` y conserva al actor en `uploaded_by` y `captured_by_user_id`.

Los tramos de trabajo se abren con el sujeto del evento. Si una acción de progreso o evidencia cambia
el sujeto, el tramo abierto se cierra en ese instante y se abre otro con el nuevo sujeto; la suma
total no cambia. La reconstrucción histórica y la corrección manual de horas aplican la misma regla.

La validación con política `both` exige primero el lado del solicitante y después el del supervisor.
El tramo desde `attended` hasta la validación del solicitante se atribuye al solicitante; el
siguiente, hasta el cierre, al supervisor. Si el solicitante no tiene cuenta, quien tiene
`validate_on_behalf` llena primero su lado y luego el propio.

Se añaden reportes de tiempo atribuido por técnico y por solicitante. La participación de
`ticket_participants` sigue siendo una medida de asignación distinta. La métrica de reasignaciones
de supervisores cuenta al supervisor destino (`subject_user_id`), no a quien ejecuta la reasignación.

## Alternativas y consecuencias

Atribuir el tiempo al actor habría dejado los indicadores del técnico o solicitante sin reflejar el
trabajo real cuando otra persona lleva el seguimiento; se descartó. Mantener el tiempo solo en
`ticket_participants` no permitía separar el trabajo de un auxiliar ni el de una persona sin cuenta.

La contrapartida es una migración que añade sujeto solicitante y usuario a eventos/tramos,
reconstruye los tramos históricos y amplía la línea de tiempo y los reportes. Los eventos antiguos
se rellenan con el solicitante del tiquet y el técnico del actor cuando se puede inferir; los casos
sin información suficiente quedan sin sujeto y no se inventan.

El orden de validación cambia respecto de “ambos en cualquier orden”: ahora la primera validación
del ciclo es la del solicitante. Se conserva la validación a nombre del solicitante cuando no tiene
cuenta. La satisfacción y la reclamación mantienen sus reglas de estado.
