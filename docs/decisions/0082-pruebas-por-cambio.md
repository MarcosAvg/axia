# 0082 — Pruebas por cambio y compuerta por niveles

## Contexto

La compuerta completa incluye Vitest, Playwright, integración contra PostgreSQL y build. Es
necesaria antes de integrar, pero repetirla después de cada edición convierte una tarea con varios
intentos de corrección en una hora de espera. Además, `pnpm test` en la web incluye Playwright, lo
que hace que un comando aparentemente unitario ejecute flujos de navegador.

## Decisión

- El ciclo local usa `pnpm check:fast` (estáticos y unitarias) y `pnpm test:affected` (pruebas
  Vitest relacionadas con los archivos cambiados).
- Los cambios de interfaz usan `pnpm test:e2e:smoke` como mínimo local. El E2E completo se reserva
  para el cierre y para CI.
- Los cambios de migración o esquema ejecutan toda la integración de PostgreSQL.
- `pnpm check` conserva su significado de compuerta completa y se ejecuta una vez antes de
  integrar. CI mantiene la compuerta completa en pull requests y en `main`.
- La base de pruebas reutiliza una plantilla migrada y se recrea por archivo desde esa plantilla,
  en lugar de aplicar todas las migraciones en cada archivo.
- Vitest web reutiliza un jsdom por worker (`pool: vmThreads`) para no crear un entorno por
  archivo.
- La matriz responsive de Playwright se limita a móvil pequeño, móvil estándar y escritorio.

## Consecuencias

- No se reduce la cobertura de reglas de negocio: se mantienen las pruebas unitarias, de
  integración y los flujos E2E críticos.
- La compuerta completa sigue siendo obligatoria para integrar; solo cambia cuándo se ejecuta.
- Los cambios estructurales (dependencias, scripts, configuración compartida) siguen disparando la
  compuerta completa desde `test:affected`.
