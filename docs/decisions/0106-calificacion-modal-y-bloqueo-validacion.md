# 0106 — Calificación en modal y bloqueo tras la validación del solicitante

**Fecha:** 2026-11-02
**Estado:** aceptada

## Decisión

La calificación de satisfacción deja de ser un formulario permanente del detalle. Se muestra en
un modal que se abre automáticamente cuando el solicitante confirma su validación; si se cierra sin
enviar, queda un botón **Calificar** en la sección mientras la calificación siga disponible. La
calificación es única por tiquet, opcional y no editable: un segundo envío responde 409.

El servidor permite calificar cuando el tiquet está `closed` o cuando está `attended` y existe la
validación del lado `requester` en el ciclo actual. El detalle expone `isRequester` y
`requesterValidated` para que la interfaz decida qué acciones ofrecer.

Una vez que el solicitante valida su lado, no puede editar el tiquet mientras no esté cerrado
(`attended` o `under_claim`): la barra de acciones solo conserva **Abrir reclamación**. La regla se
aplica en el servidor, no solo en la interfaz, y una segunda validación del mismo rol en el ciclo
responde 409.

## Alternativas y consecuencias

Se descartó otorgar `UPDATE` sobre `ticket_ratings` al rol de aplicación. La tabla está declarada
como de solo agregar en `0001_grants.sql`, igual que `ticket_validations`; ampliar el privilegio
habría permitido modificar calificaciones ya registradas y roto esa frontera. La inserción usa
`on conflict (ticket_id) do nothing` y el conflicto se informa como 409.

Se descartó mantener la calificación como sección editable: permitía enviarla o intentar cambiarla
en cualquier momento posterior al cierre. El modal conserva el momento natural de la validación y
la sección queda como resumen o acceso explícito.

La validación del solicitante ya no necesita esperar al supervisor para calificar. La contrapartida
es que una calificación puede convivir con un tiquet todavía `attended`; si después se abre una
reclamación, la calificación ya no se puede crear ni modificar. Sigue habiendo una sola calificación
por tiquet, incluso si un ciclo posterior lo reabre.

El bloqueo del solicitante validado cubre `attended` y `under_claim`; al cerrar el tiquet recupera
las acciones que su permiso y estado permitan, y la reclamación queda disponible durante todo el
tramo atendido conforme a RN-16.
