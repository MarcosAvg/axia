# 0077 — Pruebas contra PostgreSQL real y retirada de pgTAP

**Fecha:** 2026-10-21
**Estado:** aceptada

## Contexto

La suite pgTAP probaba RLS, funciones RPC y políticas del esquema anterior. El stack nuevo no tiene
RLS ni RPC de flujo: la autorización y las transiciones viven en el servidor Fastify. Mantener pgTAP
como compuerta obligaría a conservar el esquema antiguo y probaría código que ya no existe.

## Decisión

1. **Vitest contra PostgreSQL real** es la prueba principal del servidor: migraciones, permisos,
   alcance, transiciones, concurrencia e idempotencia.
2. **Playwright** cubre los flujos críticos de la PWA, incluido el trabajo sin conexión.
3. La suite pgTAP anterior se retira junto con el esquema Supabase. Las invariantes que siguen
   vigentes se expresan como pruebas de integración en `apps/server/test/db/`.
4. No se sustituyen pruebas por mocks de base: cada prueba de servidor usa una base real y limpia.

## Consecuencias

- Una sola compuerta (`pnpm check`) prueba web, servidor, base real y E2E.
- Menos duplicación: no hay dos suites para la misma transición.
- Se pierde la verificación declarativa de RLS, que ya no aplica porque no hay RLS.

## Alternativas descartadas

- **Mantener pgTAP y el esquema Supabase:** contradice la retirada y prueba código muerto.
- **Mocks de base para todo:** no detectan restricciones, concurrencia ni SQL real.
- **Dejar pgTAP sin ejecutarse:** deuda y falsa sensación de cobertura.
