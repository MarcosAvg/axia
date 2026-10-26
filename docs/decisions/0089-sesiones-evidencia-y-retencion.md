# 0089 — Cierre de SSE, evento de evidencia y retención operativa

- Fecha: 2026-10-26
- Estado: aceptada

## Contexto

La auditoría dejó tres huecos de operación: una conexión SSE seguía abierta después de cerrar
sesión o cambiar rol/estado; la creación de evidencia no escribía el evento `evidence_added` ni
llenaba `evidence.event_id`; y las tablas de sesiones, intentos de acceso y avisos crecían sin
límite. También quedaban permisos sembrados sin ninguna acción que los usara.

## Decisión

- Cada suscripción SSE recuerda su `sessionId` y su hora de cierre. Logout, cambio de contraseña,
  reseteo, revocación, cambio de rol o desactivación de una cuenta cierran las conexiones afectadas;
  también se cierran al vencer la sesión o su inactividad. El cliente reconecta con la cookie
  vigente y recibe el actor actualizado; una sesión revocada o vencida ya no recibe eventos.
- `evidence_added` se escribe en la misma transacción que la fila de evidencia y
  `evidence.event_id` queda ligado a ese evento. El payload guarda `evidenceId` y `type`; la hora
  del evento es la de captura, no la de subida, para no alterar el orden de las acciones.
- La retención borra sesiones caducadas o revocadas con más de 30 días, intentos de acceso con más
  de 90 días y avisos leídos con más de 90 días. Los avisos sin leer y la bitácora de tiquets no se
  tocan. `pnpm db:cleanup` ejecuta la limpieza; `deploy/scripts/cleanup.sh` agrupa esta tarea con la
  limpieza de evidencias para cron.
- Se retiran `ticket.open_claim_on_behalf`, `ticket.cancel_on_behalf`, `ticket.reopen` y
  `data.import`: no tienen acción asociada en el núcleo.

## Consecuencias

- Los permisos de una pestaña abierta se refrescan al reconectar, no en caliente. La conexión se
  cierra en la hora de vencimiento calculada al conectar; si otra petición extiende la inactividad,
  el cliente reconecta y recibe un plazo nuevo.
- La evidencia histórica anterior a esta migración no tiene evento; las filas nuevas sí.
- La retención es irreversible. Los umbrales se ajustan con `RETENTION_*` y el comando debe
  programarse junto con los respaldos.
