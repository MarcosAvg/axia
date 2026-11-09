# 0123 — Validación de ambos lados por la misma cuenta

**Fecha:** 2026-11-09
**Estado:** aceptada

## Decisión

Una cuenta que es solicitante y supervisora del mismo tiquet puede registrar los dos lados de la
validación en **dos pasos explícitos**. La acción `validate` acepta un campo opcional
`role: 'requester' | 'supervisor'`; cada paso escribe su fila en `ticket_validations`, su evento y su
tramo de tiempo. No se registran ambos lados en un solo clic.

La política de la instancia manda:

- `requester`: solo el lado del solicitante.
- `supervisor`: solo el lado del supervisor; el lado del solicitante no se registra.
- `both`: primero el solicitante y después el supervisor. El lado del supervisor antes del
  solicitante responde `409`.

El servidor decide por `role`, no por identidad. El lado del solicitante lo registra la cuenta
vinculada al solicitante o quien actúe con `subjectRequesterId` y `ticket.validate_on_behalf`. El
lado del supervisor exige `ticket.validate` con ámbito `team`, `buildings` o `all`, o ser el
supervisor titular; una cuenta con solo ámbito `own` no puede. Repetir un lado ya registrado
responde `409`; repetir la misma petición es idempotente.

Sin `role` se conserva la derivación anterior para clientes y acciones offline ya encoladas:
`subjectRequesterId` → solicitante; política `requester` → solicitante; política `supervisor` →
supervisor; en `both`, el solicitante que aún no validó → solicitante; en otro caso, supervisor.

El detalle expone `supervisorValidated`, `canValidateRequester` y `canValidateSupervisor`. La web
muestra «Validar como solicitante» y «Validar como supervisor» según la política, el sujeto elegido
y el lado pendiente; el modal de calificación se abre solo tras el lado del solicitante. La
proyección offline entiende los dos pasos y conserva la derivación si falta `role`.

## Alternativas y consecuencias

Se descartó un solo botón que registre ambos lados: no permite separar los tramos ni auditar dos
decisiones, y el tramo del supervisor quedaría en cero. También se descartó deducir el lado por
identidad y reintentar automáticamente: mantiene el `409` actual y no aclara qué lado se registró.

No hay migración: `ticket_validations` ya admite una fila por rol y ciclo. El coste es una acción
más en la interfaz y una derivación de compatibilidad que debe probarse. El lado del supervisor sigue
sujeto al ámbito vigente; la sombra de ámbito, la titularidad y la reclamación de un supervisor que
también es solicitante son hallazgos separados y no se modifican aquí.

## Reversión

Retirar el campo `role` del contrato y volver a la derivación por identidad; las filas y eventos ya
escritos se conservan porque el esquema no cambia.
