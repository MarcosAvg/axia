# Consolidación self-hosted Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

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

- [ ] Escribir y observar fallar regresiones de reset no autorizado y aislamiento E2E.
- [ ] Implementar validación antes de conectar, destinos exclusivos y evidencias separadas.
- [ ] Unificar arranque con recarga y separar demo explícita de primer administrador vacío.
- [ ] Probar scripts/fixtures y documentar contratos en notas de entrega al integrador.
- [ ] Commit tras verificación del subconjunto.

### Task 2: Respaldo y recuperación

**Files:** deploy/scripts de backup/restore; nuevas pruebas de scripts operativos; operacion.md.
**Interfaces:** Preservar scripts individuales; añadir `backup-all.sh` y `restore-all.sh` que
coordinan PostgreSQL y evidencias mediante un conjunto identificado y validado.

- [ ] Escribir regresiones de fallo intermedio, permisos y restauración parcial; observar fallos.
- [ ] Implementar coordinación con pausa de app, manifiesto e integridad; recuperación segura.
- [ ] Preparar roles/base en recuperación vacía; restauración transaccional; no volcar secretos.
- [ ] Verificar scripts con mocks y dejar preparado recorrido real desechable para Task 5.
- [ ] Commit tras verificación del subconjunto.

### Task 3: Imagen, configuración y release

**Files:** compose.yaml, Dockerfile, .env.example, workflows, scripts de empaquetado y tests.
**Interfaces:** `AXIA_IMAGE` selecciona exactamente una imagen; `migrate` cambia solo comando y
credenciales. `AXIA_APP_USER` deja de ofrecer una personalización incompatible con SQL existente.

- [ ] Añadir pruebas del contrato Compose e imagen compartida; observar fallos.
- [ ] Unificar artefacto, variables operativas y requisitos de producción/desarrollo.
- [ ] Enlazar publicación a checks del mismo commit y distribuir paquete operativo versionado.
- [ ] Probar expansión con entorno vacío y valores ficticios; verificar paquete sin secretos.
- [ ] Commit de imagen/contrato y ADR.

### Task 4: Migraciones y selección de pruebas

**Files:** src/db/migrate.ts, pruebas de migración, scripts/test-affected.mjs y sus regresiones.
**Interfaces:** Conservar `runMigrations(client, migrationsDir)` y metadatos previos; añadir checksum
sin modificar SQL histórico. Mantener `pnpm test:affected` con fallback conservador.

- [ ] Añadir pruebas de checksum alterado, adopción de historial sin checksum y archivo ausente.
- [ ] Observar fallos, implementar controles compatibles y probar integración PostgreSQL.
- [ ] Añadir regresiones del selector para Compose, workflows, lockfile y rutas UI.
- [ ] Corregir clasificación y ejecutar sin conexión a bases mediante intercepción de comandos.
- [ ] Commit tras verificación.

### Task 5: Verificación integral y documentación

**Files:** smoke operativo Docker y CI, README, guías de instalación/configuración/comandos,
ADR 0099 e índice, estado.md y CHANGELOG.md.
**Interfaces:** Smoke desechable crea instancia limpia, datos testigo y evidencia; verifica
backup/restore y rerun de migraciones con conservación de datos y registra versión del artefacto.

- [ ] Implementar y ejecutar smoke local con proyecto/volúmenes exclusivos de pruebas.
- [ ] Ejecutar `pnpm check:fast`, `pnpm test:affected` y compuerta `pnpm check` al cierre.
- [ ] Revisar diff con agente independiente y corregir hallazgos con regresiones.
- [ ] Documentar evidencia y límites reales; commit final. No publicar ni desplegar.

## Ledger

- Inicio: rama limpia sobre `4c26a2b`; auditoría aprobada por la persona.
- Decisión: continuar en el checkout y rama de trabajo de esta conversación; no hay trabajo ajeno.
- Tareas 1 y 2 pueden implementarse en paralelo sin editar Compose de producción ni workflows.
- Tareas 3 y 4 se implementan aquí; Task 5 integra las interfaces y verifica el conjunto.
