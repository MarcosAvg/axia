# Retirada de restos históricos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or dispatching-parallel-agents para tareas independientes. Pasos con checkboxes.

**Goal:** El checkout y la base instalada representan el Axia vigente; el historial completo se consulta en Git.
**Architecture:** Conservar monorepo, contratos y stack. Eliminar historia duplicada de documentación y objetos SQL sin consumidores mediante una migración transaccional nueva. Ninguna eliminación silenciosa de datos.
**Tech Stack:** PostgreSQL 17, Drizzle SQL, Fastify, TypeScript, Node, Vitest y Compose existentes; sin dependencias nuevas.
**Spec:** Análisis anterior aprobado con «implementa». Retirar material histórico, corregir ADR parciales y referencias; conservar SQL aplicado, referencias externas y compatibilidad de datos existentes. AGENTS.md y ADR 0101 registran el criterio.

## Global Constraints

- No producción, secretos reales ni migraciones integradas editadas.
- Retirar ocho tablas sin consumidores: catalog_aliases, catalog_import_rows/runs/specs, import_records/batches/status_map e integration_tasks.
- Conservar external_systems y ticket_external_refs, incluidas sus llaves y permisos.
- Retirar diez agregadores metrics_* sin llamadas y metrics_dims_in; conservar metrics_date_in y vistas/funciones de tiempos activas.
- Una tabla histórica con filas debe abortar la actualización con mensaje accionable y conservar todos los datos.
- No retirar ni activar Web Push/escalamiento; son pendientes explícitos, no historia borrable.
- Aprobación de implementación y autonomía de AGENTS.md sustituyen preguntas sobre elecciones técnicas rutinarias.

## Review Focus

- Actualización de una instalación 0016: preservar tiquets, eventos, cuentas, referencias y hashes.
- Presencia de datos en cualquiera de las ocho tablas: abortar sin pérdida ni registro de migración aplicada.
- Dependencias SQL imprevistas: usar DROP RESTRICT, nunca CASCADE.
- Nuevas instalaciones y actualización repetida: misma versión final y API/roles funcionando.
- Documentos retirados: ningún enlace roto ni instrucción activa basada en RLS/RPC del stack anterior.

### Task 1: Documentación vigente e historia en Git

**Files:** docs/{decisions,history,reference,guides,start,README.md}, AGENTS.md si requiere corregir referencias; no estado/plan/ADR 0101 hasta integración.
**Interfaces:** Un índice histórico breve enlaza al commit base 488862f y explica git show. Decisiones parcialmente vigentes apuntan al reemplazo actual; sus criterios funcionales se conservan.

- [x] Retirar 12 ADR ya archivados y ADR 0031/0035 exclusivamente obsoletos; corregir índice/referencias.
- [x] Retirar diseño/modelo/auditoría UI históricos, auditoría estructural resuelta y dos planes concluidos; conservar documento de integraciones exigido por AGENTS.md.
- [x] Aclarar ADR antiguos con implementación sustituida y corregir referencias actuales (RLS, schema.ts, check:next, imágenes).
- [x] Ejecutar verificador de documentación e independencia, sin pruebas artificiales de prosa.

### Task 2: Retirada SQL con actualización segura

**Files:** apps/server/db/migrations/0017_remove_retired_objects.sql; test/db/retired-schema.test.ts; test/db/migration.test.ts.
**Interfaces:** runMigrations sin nueva API. Instalaciones con datos en tablas retiradas fallan con excepción antes de DROP; migraciones anteriores conservan hashes exactos.

- [x] Escribir pruebas de instalación/actualización, presencia de datos en cada tabla, integridad y permisos de objetos conservados; observar RED antes del SQL.
- [x] Aplicar guardia transaccional de tablas vacías y DROP explícitos sin CASCADE.
- [x] Ajustar recuentos de objetos/migraciones existentes explicando el cambio en ADR 0101.
- [x] Ejecutar toda integración PostgreSQL y comprobar consultas activas de métricas y catálogos.

### Task 3: Referencias ejecutables y cierre

**Files:** scripts/test-plan.mjs, scripts/docker-smoke.sh y pruebas si procede, comentario catalog-import-specs.ts; ADR 0101, CHANGELOG, estado y este plan.

- [x] Retirar condición db/schema.ts inexistente y comentario que conecta XLSX actual con tabla retirada.
- [x] Ajustar smoke a 18 migraciones conservando prueba real de adopción de historial anterior.
- [x] Documentar alcance, acceso Git, guarda de datos y sustitución de recuentos de pruebas.
- [x] Ejecutar check:fast, revisión independiente, test:affected → check completo y smoke de imagen con migración nueva.
- [x] Preparar commits coherentes e integración local con compuerta verde; no push ni despliegue.

## Ledger

- Base limpia 488862f, main local; continuar en rama codex/retirar-restos-historicos dentro del checkout autorizado.
- Decisión: Git conserva prosa exclusivamente histórica; un índice breve evita duplicar el archivo completo.
- Decisión: no borrar datos históricos desconocidos. El guard SQL aborta y exige exportación/revisión del operador.
- Coordinación: solo root usa axia_test; documentación y scripts pueden avanzar en paralelo sin reconstruirla.
- Ruling: este plan es un documento de trabajo; guardarlo en un commit y retirarlo del checkout al cerrar, conservando recuperación Git como los planes anteriores.
- RED: diez pruebas de retirada fallaron antes de 0017; sin bloqueos la prueba de escritor concurrente también falló. GREEN: 25 pruebas específicas y 243 PostgreSQL, más check:fast completo.
- Revisión independiente cerrada sin hallazgos; verificados índices, veinte rutas históricas recuperables y ausencia de consumidores SQL retirados.

- Cierre: test:affected → check código 0 (46 Node, 57 servidor, 298 web, 52 E2E y 243 DB); check:fast y smoke Docker real verdes. Huella del SQL de la imagen idéntica al checkout.
- Incidencia: primera compuerta falló claims registro con foto (módulo dinámico) y metrics filtro edificio (login no visible) mientras corría Docker. Subconjunto 2/2 y compuerta completa posterior verdes sin cambios de pruebas/límites; causa no confirmada.
- El mensaje de recuperación vive en la excepción principal: el runner no propaga HINT separado. Dependencias inesperadas usan RESTRICT, sin CASCADE.
