# 0019 — Evidencia sin conexión: compresión, Dexie y subida reanudable

- Fecha: 2026-10-08
- Estado: aceptada

## Contexto

El técnico trabaja en campo y puede no tener señal. El ADR 0004 fijó la cola offline con Dexie y la
subida reanudable, pero la Fase 3A subía la evidencia en línea y sin compresión. La Fase 4A hace que
la evidencia funcione sin conexión.

## Decisión

- **Compresión en el dispositivo** con `canvas` (sin dependencias): reduce el lado mayor a 1600 px y
  convierte a JPEG; si la imagen no se puede decodificar, se sube tal cual.
- **Cola de salida genérica** (`lib/offline/outbox.ts`): cada operación se encola con su tipo y un
  UUID del cliente, se procesa en orden y se reintenta hasta 5 veces. Un aviso opcional se dispara
  al terminar de procesar.
- **Evidencia en Dexie** (`evidences`) con tipo, ciclo, blob, MIME y estado; la subida se encola como
  `evidence_upload`.
- **Subida reanudable con TUS** (`tus-js-client`) al endpoint de Storage y, al terminar, `evidence_add`
  (idempotente con `client_request_id`).
- **React Query con `networkMode: 'always'`** en la mutación de evidencia: sin eso, cuando no hay
  conexión la mutación queda **pausada** y nunca se ejecuta. Así la mutación se ejecuta siempre y
  delega la conexión a la cola.
- La sincronización se dispara al abrir, al evento `online` y al volver a primer plano; tras cada
  procesamiento se invalidan las consultas de tiquets para reflejar lo subido.
- La interfaz muestra las evidencias **pendientes** (desde Dexie) y un aviso de "sin conexión" / número
  de pendientes.

## Alternativas consideradas

- **Subida simple con reintentos**: más simple, pero una foto grande que se corta reinicia desde cero;
  las convenciones piden TUS.
- **Librería de compresión**: `canvas` basta y evita una dependencia.

## Consecuencias

- El técnico puede tomar la evidencia sin conexión; se sube al recuperar la red.
- Pendiente (resto de la Fase 4A): enrutar las **acciones del tiquet** (iniciar, pausar, atender…) por
  la misma cola cuando no hay conexión; hoy solo la evidencia está offline.
- Los archivos `blob` no se conservan en `fake-indexeddb` (solo pruebas); en el navegador real sí.
