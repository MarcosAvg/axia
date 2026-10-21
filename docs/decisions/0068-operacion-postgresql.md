# 0068 — Operación y rendimiento de PostgreSQL

**Fecha:** 2026-10-20
**Estado:** aceptada

## Contexto

La base autoalojada ya existe, pero todavía no hay datos ni cargas representativas. La guía de
PostgreSQL recomienda medir antes de indexar, no abusar de PgBouncer, ajustar memoria y mantener
autovacuum. El plan inicial mencionaba índices concurrentes, pero el runner los envolvía en una
transacción y no podía ejecutarlos.

## Decisión

1. **Migraciones no transaccionales:** un archivo con `-- axia:no-transaction` se ejecuta fuera de
   transacción. Debe contener una sola sentencia idempotente y se registra solo si termina. Sirve
   para `CREATE INDEX CONCURRENTLY`, `VACUUM` y `REINDEX CONCURRENTLY`.
2. **Sin PgBouncer por ahora:** un único proceso Node y un pool de 10 conexiones son suficientes.
   Se reevaluará con varias réplicas o cientos de usuarios.
3. **LISTEN/NOTIFY dedicado:** el futuro SSE usará una conexión fuera del pool, con reconexión; no
   consumirá conexiones de peticiones normales.
4. **Índices dirigidos por consultas:** no se indexan todos los FKs. Se auditan con
   `pnpm db:next:indexes`, se mide con `EXPLAIN (ANALYZE, BUFFERS)` y se crea solo lo que reduzca el
   coste real.
5. **Sin particiones todavía:** se revisará `ticket_events` si llega a decenas de millones de filas o
   varios GB y las consultas por rango lo justifican. Antes se evaluará un BRIN sobre `recorded_at`.
6. **Ajuste explícito de PostgreSQL:** `compose.yaml` fija `shared_buffers`, `effective_cache_size`,
   `work_mem`, `maintenance_work_mem`, `max_connections` y `track_io_timing`, todos configurables por
   entorno. La imagen se fija a una versión concreta.
7. **Vistas internas:** métricas y timeline no se publican hasta que exista `can` + alcance por
   repositorio y pruebas negativas.

## Consecuencias

- La primera migración que cree un índice en caliente ya tiene un camino válido.
- No se añade infraestructura de pooling ni particionado prematuro.
- El rendimiento real se validará cuando haya datos; este ADR no afirma que el esquema sea rápido.
- El runbook está en `docs/reference/rendimiento-postgres.md`.

## Alternativas descartadas

- **PgBouncer desde el inicio:** complejidad innecesaria para un solo proceso.
- **Particionar `ticket_events` ya:** cambia PK/FKs y no hay evidencia de volumen.
- **Indexar todos los FKs:** sobreindexación y más coste de escritura/vacuum.
- **Crear índices con `CREATE INDEX` normal en producción:** bloquea escrituras; solo se acepta en
  la instalación inicial o en una ventana de mantenimiento justificada.
