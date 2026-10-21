# 0069 — Servidor Fastify, compilación y estáticos

**Fecha:** 2026-10-21
**Estado:** aceptada

## Contexto

El tramo 1 dejó la base de datos y el runner de migraciones, pero no existe servidor HTTP. El
objetivo es uno solo: API, salud, seguridad, archivos y SSE en el futuro, y el mismo proceso sirve
la PWA después del corte. La app actual sigue sobre el stack anterior.

## Decisión

1. **Fastify 5** (`5.12.7`) como framework HTTP. Se elige por su rendimiento, tipado, ecosistema
   de plugins oficiales y soporte de `inject` para pruebas sin abrir un puerto.
2. **Compilación con `tsc` y NodeNext** para producción. La imagen no ejecuta `tsx` ni incluye
   devDependencies. Los imports locales del servidor usan la extensión `.js`.
3. **Dos endpoints de salud:** `/api/health/live` (proceso vivo) y `/api/health/ready` (`select 1`
   con timeout). El healthcheck de Compose usa `ready`.
4. **Seguridad base:** Helmet con CSP, `x-content-type-options`, `referrer-policy` y HSTS solo en
   producción. Sin CORS: la API y la UI serán del mismo origen. Límite de cuerpo de 1 MiB.
5. **Contrato de error:** `AppError` + respuesta `{ error: { code, message }, requestId }`. Los
   errores 500 no exponen stack ni detalles. `/api/*` siempre responde JSON; el fallback SPA solo
   aplica a GET sin extensión.
6. **Estáticos opcionales:** `STATIC_DIR` activa `@fastify/static`, caché inmutable para `/assets/`
   y `no-cache` para `index.html`. En este tramo **no se publica el build actual** de la web porque
   depende de la configuración del stack anterior en runtime; se activará en el corte final.
7. **Ciclo de vida:** `SIGTERM`/`SIGINT` cierran Fastify y el pool con un timeout de seguridad. El
   pool es el mismo de 10 conexiones del tramo 1; no se añade PgBouncer.
8. **Compose:** `migrate` y `app` como destinos separados del mismo Dockerfile. `app` no publica
   puertos en el compose base; `compose.dev.yaml` publica solo `127.0.0.1:${APP_PORT}`.

## Consecuencias

- El servidor puede probarse con `fastify.inject` sin base de datos para rutas que no la usan.
- La base real se usa para `checkDatabase` y para `/api/health/ready` en integración.
- La imagen de producción no incluye TypeScript ni herramientas de desarrollo.
- El frontend no cambia todavía. El build de la PWA se añadirá al destino `app` en el tramo 9.
- La CSP debe revisarse contra el build real cuando se active `STATIC_DIR`; si alguna dependencia
  necesita un origen adicional, se justificará y probará.

## Alternativas descartadas

- **`tsx` en producción:** evita compilar, pero mantiene devDependencies y no es el runtime previsto.
- **Publicar el frontend actual ahora:** el cliente espera `config.js` del stack anterior y el objetivo es
  retirarlo; publicarlo daría una UI rota o una dependencia oculta.
- **CORS abierto:** no hay clientes de otros orígenes en el diseño; se añadirá solo si aparece uno.
- **Rate limit global ahora:** se implementará con login y API de negocio, donde tiene sentido.
