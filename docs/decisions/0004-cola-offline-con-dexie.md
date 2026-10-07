# 0004 — Cola offline con Dexie

- Fecha: 2026-10-07
- Estado: aceptada

## Contexto

Los técnicos trabajan en campo, muchas veces sin conexión. Las acciones (iniciar, pausar,
resolver, adjuntar fotos) no pueden perderse ni duplicarse al recuperar la red. En iOS Safari no
existe Background Sync, así que no se puede depender del service worker para sincronizar.

## Decisión

Guardar primero en el dispositivo con **IndexedDB a través de Dexie**, en una cola `outbox`. Cada
acción se identifica con un **UUID generado en el cliente** (`crypto.randomUUID()`), que la
función en Postgres usa como clave de idempotencia (`client_request_id`). Las fotos se comprimen
antes de guardarse y se suben de forma reanudable (TUS). La sincronización se dispara al abrir la
app, al evento `online` y al volver a primer plano (`visibilitychange`).

## Alternativas consideradas

- **`localStorage`:** tamaño y tipos limitados; no sirve para blobs.
- **Background Sync:** no existe en iOS Safari.
- **Sin modo offline:** inaceptable para el flujo del técnico.

## Consecuencias

- El técnico puede trabajar sin conexión y sincronizar después, sin duplicar acciones.
- La idempotencia se apoya en `client_request_id` único en Postgres.
- Aumenta la complejidad: estados de la cola, reintentos con espera creciente y evidencias
  pendientes de subir.
- Revertir implica sustituir la capa offline; está aislada en `lib/offline`.
