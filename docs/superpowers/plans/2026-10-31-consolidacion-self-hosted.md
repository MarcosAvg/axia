# Consolidación self-hosted Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Convertir los recorridos operativos auditados en procedimientos seguros y reproducibles.
**Architecture:** Conservar PostgreSQL y servidor único. Separar datos y preparación de entornos;
usar la misma imagen para app y migrador y coordinar recuperación con mantenimiento breve.
**Tech Stack:** pnpm, Node 24, TypeScript, PostgreSQL 17, Docker Compose, Vitest y Playwright.
**Spec:** [Auditoría aprobada](../../internal/auditoria-estructura-self-hosted-2026-10-31.md).

## Global Constraints

- No producción, lectura de secretos reales ni nuevas dependencias.
- No editar migraciones SQL integradas; no cambiar permisos/reglas de negocio.
- Código en inglés; interfaz, guías y commits en español.
- Desarrollar en la rama aislada existente del diagnóstico; no crear otro checkout innecesario.
- La autorización de implementación y la autonomía de AGENTS.md sustituyen otra ronda de aprobación técnica.

## Review Focus

- Un destino de trabajo o remoto debe rechazarse antes de cualquier reset automático.
- Fallos intermedios del respaldo deben reactivar solo los servicios originalmente activos.
- Una restauración errónea no debe reemplazar parcialmente la base ni anunciar éxito.
- Artefactos de release deben corresponder al commit verificado y la misma imagen de migración.
- Una migración antigua modificada debe rechazarse sin sobrescribir su huella anterior.

### Task 1: Entornos, desarrollo y demo

**Files:** scripts de desarrollo/E2E/instalación y sus pruebas; scripts y setup de pruebas del
servidor; configuraciones Playwright; compose.dev.yaml y nuevo Compose de pruebas; package.json.
**Interfaces:** Mantener `pnpm dev`, `dev:api`, `db:start`, `db:test`, `test:e2e` y `test:visual`.
Producir preparación reproducible de bases test y E2E distintas, sin cargar `.env` real en tests.

- [x] Escribir y observar fallar regresiones de reset no autorizado y aislamiento E2E.
- [x] Implementar validación antes de conectar, destinos exclusivos y evidencias separadas.
- [x] Unificar arranque con recarga y separar demo explícita de primer administrador vacío.
- [x] Probar scripts/fixtures y documentar contratos en notas de entrega al integrador.
- [x] Commit tras verificación del subconjunto.

### Task 2: Respaldo y recuperación

**Files:** deploy/scripts de backup/restore; nuevas pruebas de scripts operativos; operacion.md.
**Interfaces:** Preservar scripts individuales; añadir `backup-all.sh` y `restore-all.sh` que
coordinan PostgreSQL y evidencias mediante un conjunto identificado y validado.

- [x] Escribir regresiones de fallo intermedio, permisos y restauración parcial; observar fallos.
- [x] Implementar coordinación con pausa de app, manifiesto e integridad; recuperación segura.
- [x] Preparar roles/base en recuperación vacía; restauración transaccional; no volcar secretos.
- [x] Verificar scripts con mocks y dejar preparado recorrido real desechable para Task 5.
- [x] Commit tras verificación del subconjunto.

### Task 3: Imagen, configuración y release

**Files:** compose.yaml, Dockerfile, .env.example, workflows, scripts de empaquetado y tests.
**Interfaces:** `AXIA_IMAGE` selecciona exactamente una imagen; `migrate` cambia solo comando y
credenciales. `AXIA_APP_USER` deja de ofrecer una personalización incompatible con SQL existente.

- [x] Añadir pruebas del contrato Compose e imagen compartida; observar fallos.
- [x] Unificar artefacto, variables operativas y requisitos de producción/desarrollo.
- [x] Enlazar publicación a checks del mismo commit y distribuir paquete operativo versionado.
- [x] Probar expansión con entorno vacío y valores ficticios; verificar paquete sin secretos.
- [x] Commit de imagen/contrato y ADR.

### Task 4: Migraciones y selección de pruebas

**Files:** src/db/migrate.ts, pruebas de migración, scripts/test-affected.mjs y sus regresiones.
**Interfaces:** Conservar `runMigrations(client, migrationsDir)` y metadatos previos; añadir checksum
sin modificar SQL histórico. Mantener `pnpm test:affected` con fallback conservador.

- [x] Añadir pruebas de checksum alterado, adopción de historial sin checksum y archivo ausente.
- [x] Observar fallos, implementar controles compatibles y probar integración PostgreSQL.
- [x] Añadir regresiones del selector para Compose, workflows, lockfile y rutas UI.
- [x] Corregir clasificación y ejecutar sin conexión a bases mediante intercepción de comandos.
- [x] Commit tras verificación.

### Task 5: Verificación integral y documentación

**Files:** smoke operativo Docker y CI, README, guías de instalación/configuración/comandos,
ADR 0099 e índice, estado.md y CHANGELOG.md.
**Interfaces:** Smoke desechable crea instancia limpia, datos testigo y evidencia; verifica
backup/restore y rerun de migraciones con conservación de datos y registra versión del artefacto.

- [x] Implementar y ejecutar smoke local con proyecto/volúmenes exclusivos de pruebas.
- [x] Ejecutar `pnpm check:fast`, `pnpm test:affected` y compuerta `pnpm check` al cierre.
- [x] Revisar diff con agente independiente y corregir hallazgos con regresiones.
- [x] Documentar evidencia y límites reales; commit final. No publicar ni desplegar.

## Ledger

- Inicio: rama limpia sobre `4c26a2b`; auditoría aprobada por la persona.
- Decisión: continuar en el checkout y rama de trabajo de esta conversación; no hay trabajo ajeno.
- Tareas 1 y 2 pueden implementarse en paralelo sin editar Compose de producción ni workflows.
- Tareas 3 y 4 se implementan aquí; Task 5 integra las interfaces y verifica el conjunto.
- Task 1: complete — destinos protegidos 7/7; desarrollo real HTTP200 y cierre de ambos watchers;
  smoke navegador serial 11/11. El fallo paralelo motivó serializar fixtures compartidos sin
  cambiar aserciones ni añadir retries locales.
- Task 2: complete — mocks de éxito/fallo y selección de imagen con dependencias; prueba Docker
  RED root sin capacidades → GREEN usuario propietario, sin alterar hardening.
- Task 3: complete — contrato Compose 4/4, empaquetado 2/2, publicación condicionada a CI y smoke
  del artefacto exacto antes de push. No se ejecutó publicación remota.
- Task 4: complete — migraciones 20/20 en subconjunto; selector 20/20. La revisión detectó bootstrap
  repetido y smoke condicionado a variable; ambas regresiones fallaron antes de corregirlas.
- Task 5: complete — `test:affected` → `pnpm check`, código 0: 57 servidor + 269 web + 52 E2E +
  197 PostgreSQL, 30 regresiones Node y scripts Bash; build y estáticos verdes. Smoke Docker final
  con imagen reconstruida pasó; revisión independiente completada sin menores pendientes.
- Ruling: continuar en rama del checkout existente — no había trabajo ajeno y AGENTS.md pide
  autonomía; evita otro entorno duplicado. Riesgo residual: no hay segundo checkout físico.
- Ruling: recuperar solo sobre destino vacío y mantener app parada si falla — impide mezcla de
  datos; el costo es requerir otro conjunto de volúmenes para reintentar un restore fallido.
- Ruling: el smoke actualiza el historial real previo a hashes, no una release histórica completa
  descargada — aún no hay un catálogo de releases verificadas; futuros saltos requieren sus notas
  y pruebas. No se anuncia ARM ni recuperación entre arquitecturas.
- Final review: tres hallazgos importantes corregidos con RED→GREEN; ninguno menor diferido.
