# 0111 — Proxy explícito del solicitante

**Fecha:** 2026-11-03
**Estado:** aceptada

## Decisión

Validar, calificar, abrir una reclamación o cancelar **a nombre del solicitante** exige que el actor
seleccione explícitamente al solicitante como sujeto proxy. El permiso específico
(`ticket.validate_on_behalf`, `ticket.rate_on_behalf`, `ticket.open_claim_on_behalf`,
`ticket.cancel_on_behalf`) autoriza ese modo, pero no lo activa por sí solo.

El contrato de acciones acepta `subjectRequesterId`. Si está presente, debe coincidir con el
solicitante del tiquet y el actor debe tener el permiso específico con alcance. Si está ausente, la
acción es propia: la validación registra el lado del supervisor, la calificación solo la puede
hacer el propio solicitante y la reclamación o cancelación se atribuyen al actor.

En política `both`, la validación del supervisor sin proxy exige que el solicitante ya haya
validado; si no, responde 409. La interfaz muestra un selector único «Actuar a nombre de» con el
solicitante y los técnicos participantes, y adapta las acciones visibles al sujeto elegido.

La migración 0022 reañade `ticket.open_claim_on_behalf` y `ticket.cancel_on_behalf`, retirados en la
0011 como permisos sin uso, y los concede a supervisor (`team`) y administrador (`all`).

## Alternativas y consecuencias

Se descartó mantener el relleno automático del lado del solicitante con solo tener el permiso:
permitía que un supervisor validara, calificara, reclamara o cancelara en nombre del solicitante sin
elegirlo, incluso cuando el solicitante tenía cuenta y podía hacerlo por sí mismo. También impedía
distinguir en la auditoría una acción propia de una proxy.

La contrapartida es un paso más para el supervisor que atiende a un solicitante sin cuenta: debe
elegir «Solicitante» en el selector. Las acciones offline encoladas con el formato anterior se
interpretan como propias; una validación sin sujeto puede responder 409 si falta el lado del
solicitante. La atribución de eventos de reclamación, cancelación y rechazo cambia: sin proxy se
atribuyen al actor, no al solicitante.

Los permisos nuevos no se conceden a roles personalizados; quien los necesite debe otorgarlos desde
la administración de roles.
