# Arquitectura

Axia es una PWA con un único servidor y PostgreSQL. No depende de plataformas externas para
funcionar.

## Componentes

| Componente | Responsabilidad |
|---|---|
| `apps/web` | SPA/PWA en Vite, React y TypeScript |
| `apps/server` | Fastify 5, API, autenticación, SSE, evidencias y sincronización |
| PostgreSQL 17 | Datos, sesiones, historial, tramos y notificaciones |
| Volumen de evidencias | Archivos normalizados y miniaturas |
| Compose | `db`, `migrate` y `app` |

La web habla solo con `/api`. Los componentes usan `features/*/api`; ningún componente llama a la
API directamente.

## Flujo de una petición

1. La cookie de sesión identifica al actor.
2. `can`/`canAct` evalúan permiso y ámbito.
3. El repositorio aplica el alcance en SQL.
4. La acción se ejecuta en una transacción y escribe el evento en `ticket_events`.
5. SSE notifica el cambio a las sesiones con alcance.

## Datos y tiempo

- El historial es de solo agregar.
- Los tiempos se calculan desde los tramos; no se almacenan cifras sueltas.
- Las fechas usan `timestamptz` y una zona horaria configurable.
- La evidencia vive en un volumen privado y se sirve por ruta autenticada.

## Operación

- El pool de PostgreSQL está limitado a 10 conexiones.
- `LISTEN/NOTIFY` usa una conexión dedicada.
- Las migraciones usan un advisory lock y se pueden marcar como no transaccionales para índices
  concurrentes.
- No se añaden PgBouncer ni particiones sin medición previa.

## Decisiones

Las decisiones de arquitectura están en [`../decisions/`](../decisions/). Las que describen el
sistema actual están marcadas como vigentes en el índice.
