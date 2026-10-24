# 0084 — Hora manual solo al actuar por proxy

- Fecha: 2026-10-24
- Estado: aceptada

## Contexto

El ADR 0081 permitió fijar `occurredAt` en el alta y en todas las acciones. En la práctica, el
formulario mostraba “Hora real de la acción” también en acciones directas, donde la hora debe ser
la del momento en que se ejecutan. Mezclar ambos casos hacía ambiguo el registro y permitía que una
acción propia quedara con una hora elegida a mano sin relación con el trabajo realizado.

Además, la interfaz enviaba el técnico sujeto (`subjectTechnicianId`) pero la API lo descartaba al
validar la acción. El proxy no quedaba registrado y la hora manual se atribuía solo al actor.

## Decisión

- **Acciones directas:** no muestran selector de hora. El evento usa la hora del servidor; si la
  acción se captura sin conexión, conserva la hora del cliente como parte del contrato offline.
- **Acciones por proxy:** solo las acciones de técnico (`start`, `pause`, `advance_pause`,
  `resume`, `attend`, `recapture`) aceptan `subjectTechnicianId` y, con él, `occurredAt`.
- **Alta de tiquet:** el alta propia usa la hora del servidor. `occurredAt` solo se acepta cuando
  se registra a nombre de otra persona (`ticket.create_on_behalf`).
- El servidor exige `time.record_manual` y un sujeto para aceptar `occurredAt` en una acción.
  También valida `act_on_behalf` por alcance (`all` o `team`), que el técnico esté activo y que
  participe en el tiquet. La recaptura puede ocurrir antes de la asignación, así que no exige
  participación.
- El sujeto se guarda en `ticket_events.subject_technician_id`; el actor y el sujeto quedan
  separados.
- **Ajustar hora** de la línea de tiempo se mantiene: es una corrección auditada de un evento ya
  registrado, no la captura de una acción directa.

## Consecuencias

- La hora de una acción directa refleja cuándo se hizo, sin intervención manual.
- Las acciones a nombre de un técnico quedan atribuidas y pueden llevar la hora real del trabajo.
- Un cliente que envíe `occurredAt` sin sujeto recibe un error de validación.
- `time.record_manual` por sí solo ya no habilita a fijar la hora de una acción: se necesita
  además un sujeto válido por `act_on_behalf`.
