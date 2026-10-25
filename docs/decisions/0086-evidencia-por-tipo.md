# 0086 — Autorización de evidencia por tipo

- Fecha: 2026-10-25
- Estado: aceptada

## Contexto

`POST /api/tickets/:id/evidence` solo autorizaba con `evidence.attach` o
`ticket.record_progress`. El rol solicitante no tiene ninguno de los dos, pero sí puede abrir una
reclamación (`ticket.open_claim`), que exige una evidencia `claim`. El resultado era un 403: el
solicitante no podía completar la reclamación. La foto de la solicitud usaba el mismo endpoint y
fallaba en silencio al registrarse por un solicitante.

## Decisión

La autorización se evalúa por tipo de evidencia y por la acción que la justifica, con el acceso real
al tiquet (`canAct`, no solo la presencia del permiso):

- `claim`: `ticket.open_claim` sobre el tiquet, o `evidence.attach`.
- `request`: el solicitante del tiquet o quien lo registró, con `ticket.create` o
  `ticket.create_on_behalf`, o `evidence.attach`.
- `before`, `during`, `after`: `ticket.record_progress` sobre el tiquet, o `evidence.attach`.
- `other`: `evidence.attach`.

`evidence.attach` conserva el alcance del permiso (`team`, `buildings` o `all`) y sigue habilitando
cualquier tipo. La regla vive en `canAttachEvidence` (`apps/server/src/evidence/access.ts`), una
función pura con pruebas unitarias.

Además, si la subida falla con un error de dominio, el cliente borra la fila local de Dexie para no
dejar una evidencia pendiente que nunca se subirá; la foto de la solicitud muestra un aviso si falla.

## Consecuencias

- El solicitante puede completar reclamaciones y adjuntar la foto de su solicitud.
- No se le concede `evidence.attach`, así que no puede adjuntar evidencias de trabajo ni “otras”.
- Supervisores y administradores conservan su capacidad de adjuntar cualquier tipo según su ámbito.
- La autorización de evidencia queda alineada con los permisos de las acciones, no con dos permisos
  globales.
