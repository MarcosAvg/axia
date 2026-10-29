# 0093 — Borrado de usuarios sin romper la bitácora

**Estado:** aceptada
**Fecha:** 2026-10-29

## Contexto

La administración necesita eliminar cuentas, por ejemplo duplicados o usuarios de prueba. La tabla
`users` está referenciada por la bitácora de tiquets, evidencias, tiempos, asignaciones y otras
tablas. Un `DELETE` directo falla si la cuenta tiene historial; borrar esas referencias eliminaría
quién hizo cada acción.

## Decisión

`DELETE /api/admin/users/:id` intenta primero borrar la fila. Si PostgreSQL rechaza la operación por
una clave foránea, la cuenta se archiva:

- `active = false` y `deleted_at = now()`;
- el `username` cambia a `deleted-<uuid>` para liberar el nombre original;
- se conserva `full_name` para la bitácora;
- se revocan sesiones y se quitan roles, ámbitos, notificaciones, suscripciones push y vínculos con
  solicitantes/técnicos;
- la cuenta desaparece de las listas y no puede iniciar sesión.

Las cuentas sin historial se borran de verdad. En ambos casos la protección de la propia cuenta y del
último administrador se aplica antes del borrado.

## Alternativas consideradas

- **Solo desactivar:** no libera el nombre ni quita la cuenta de la lista.
- **Borrar siempre con cascadas:** elimina o desasocia la bitácora y pierde la autoría.
- **Anonimizar el nombre:** impide saber quién hizo cada acción en tiquets históricos.

## Consecuencias

- La bitácora conserva el nombre visible de las cuentas archivadas.
- El nombre de usuario original queda libre para una cuenta nueva.
- No hay restauración desde la interfaz; una cuenta archivada se recupera solo con intervención
  directa en la base.
- Las cuentas nuevas o sin uso no dejan filas residuales.
