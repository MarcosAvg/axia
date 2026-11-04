# Diseño: proxy explícito del solicitante

Fecha: 2026-11-03
Estado: aprobado

## Intención

Una acción que sustituye la decisión del solicitante —validar, calificar, abrir una reclamación o
cancelar— solo puede ejecutarse **actuando como proxy del solicitante**. Tener el permiso
`*_on_behalf` no basta: el actor debe elegirlo de forma explícita. Sin proxy, la acción es propia
del actor y no se registra como si el solicitante la hubiera hecho.

Hoy `validationRole` rellena el lado del solicitante con solo tener `ticket.validate_on_behalf`, y
la calificación se atribuye al solicitante aunque el actor sea un supervisor sin proxy. La cuenta
del solicitante es indiferente: la regla se aplica siempre.

## Decisiones

- Un **selector único** «Actuar a nombre de» ofrece «Nadie (acción propia)», «Solicitante: nombre»
  y los técnicos participantes.
- Con sujeto solicitante se muestran solo las acciones que lo admiten: validar, calificar, abrir
  reclamación y cancelar. Con sujeto técnico, las acciones de técnico. Sin sujeto, las propias.
- El contrato de acciones acepta `subjectRequesterId`; si viene, debe ser el solicitante del
  tiquet y el actor necesita el permiso específico. Si no viene, la acción es propia.
- Validar sin proxy registra el lado del supervisor. En política `both` exige que el solicitante
  haya validado primero; si no, responde 409.
- Calificar sin proxy solo lo puede hacer el propio solicitante. Un supervisor sin proxy recibe
  403.
- Reclamar o cancelar sin proxy se atribuyen al actor, no al solicitante. Con proxy se atribuyen
  al solicitante. `reject` deja de atribuirse al solicitante porque no es una acción suya.
- Se reañaden `ticket.open_claim_on_behalf` y `ticket.cancel_on_behalf` (retirados en la migración
  0011) con una migración nueva, concedidos a supervisor y administrador.
- El detalle expone `validationPolicy` para que la interfaz explique el bloqueo de orden.

## Fuera de alcance

- No hay proxy de solicitante para el alta: el alta ya elige al solicitante de forma explícita.
- No se cambia la atribución del técnico ni de las asignaciones.
- No se añade validación automática ni cambios de política.

## Pruebas

Casos negativos y positivos por actor y sujeto, orden de validación, permisos, sujeto incorrecto,
atribución de eventos de reclamación/cancelación, replay idempotente, unidad de la interfaz y un
flujo E2E de validación en dos pasos con proxy.
