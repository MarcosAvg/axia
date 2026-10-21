# 0067 — Base de datos autoalojada y migraciones

**Fecha:** 2026-10-20
**Estado:** aceptada

## Contexto

La Etapa A de la migración definió PostgreSQL estándar, Drizzle ORM/Kit y un servidor Node
propio. El esquema actual vive en 42 migraciones del stack anterior, con `auth.users`, RLS, políticas y
Storage. La primera fase debe conservar tablas, restricciones, historial, disparadores y
métricas sin arrastrar la plataforma anterior.

## Decisión

1. Usar PostgreSQL 17 y un único esquema `public` más `extensions` para `pg_trgm`.
2. Tomar el esquema legado como referencia, limpiarlo (sin `auth`, RLS, políticas ni Storage),
   renombrar `profiles` a `users` y fijar una migración base `0000_base.sql`.
3. Mantener el esquema de tablas en Drizzle (`apps/server/src/db/schema.ts`), obtenido por
   introspección y revisado; las vistas, funciones y disparadores viven en SQL versionado.
4. Usar un ejecutor de migraciones propio, con `pg_advisory_lock`, tabla
   `axia_migrations.schema_migrations` y una transacción por archivo. No se usa la migración remota.
5. Separar `axia_owner` (DDL/migraciones) de `axia_app` (login de la aplicación, sin DDL). Los
   grants viven en `0001_grants.sql`.
6. No usar RLS en esta versión. La autorización se implementará en el servidor; las tablas y
   columnas quedan preparadas para añadir RLS después sin cambiar el modelo.
7. Retirar de la base las RPC de autenticación, flujo, importación e integración. Las transiciones
   se implementarán en servicios TypeScript dentro de transacciones; la base conserva claves,
   restricciones, disparadores de integridad y las vistas/funciones de métricas y tiempo.

## Consecuencias

- La aplicación actual sigue sobre el stack anterior hasta el corte final; el stack nuevo se prueba en
  paralelo con `pnpm check:next`.
- El rol de aplicación puede leer datos y escribir solo lo permitido; no puede crear objetos,
  borrar historial/evidencia ni actualizar bitácora.
- Las migraciones futuras son SQL ordenado y verificable; Drizzle se usa para tipos y consultas.
- La equivalencia quedó registrada en el historial de la migración. Las diferencias
  intencionadas (usuarios, sesiones, entregas, canales, evidencias e idempotencia) están ahí.
- Riesgo asumido: la introspección de Drizzle no captura todos los objetos SQL; por eso la
  migración base es la fuente de verdad y las pruebas de integración validan el esquema aplicado.

## Alternativas descartadas

- **Conservar la CLI del stack anterior para migrar:** mantiene una dependencia que la decisión de
  independencia quiere eliminar.
- **Generar toda la base desde Drizzle Kit:** no expresa bien vistas, funciones y disparadores
  existentes, y perdía comentarios/restricciones no obvias.
- **RLS desde el primer día:** la autorización aún no está portada y el servidor es el único
  cliente; se añadirá después con pruebas específicas.
