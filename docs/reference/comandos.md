# Comandos

Comandos disponibles desde la raíz del repositorio.

## Desarrollo

| Comando | Efecto |
|---|---|
| `pnpm dev` | PostgreSQL aislado y API/web host con recarga (`3100`/`5173`) |
| `pnpm dev:api` | API local en `http://127.0.0.1:3100`; guarda evidencias en `apps/server/data/evidence` |
| `pnpm build` | Compila servidor y SPA |
| `pnpm lint` | ESLint en todo el monorepo |
| `pnpm typecheck` | TypeScript en todo el monorepo |
| `pnpm test` | Vitest y Playwright |
| `pnpm format` | Prettier |
| `pnpm test:visual` | Regresión visual opt-in |

## Base de datos

| Comando | Efecto |
|---|---|
| `pnpm db:start` | Levanta PostgreSQL local con Compose |
| `pnpm test:db:start` | PostgreSQL desechable para integración y E2E (`55433`) |
| `pnpm test:db:stop` | Retira solo el proyecto de pruebas, sin volúmenes persistentes |
| `pnpm db:stop` | Detiene PostgreSQL local |
| `pnpm db:reset` | Requiere `-- --development`; reconstruye solo una base local `_dev` |
| `pnpm db:test` | Pruebas de integración contra PostgreSQL real |
| `pnpm db:demo -- --demo` | Carga la semilla demo local |
| `pnpm db:indexes` | Audita índices y claves foráneas |
| `pnpm db:cleanup` | Aplica la retención de sesiones, intentos y avisos |
| `pnpm db:cleanup-evidence` | Limpia subidas de evidencia abandonadas |

## Calidad

| Comando | Efecto |
|---|---|
| `pnpm check:fast` | Ciclo local: lint, tipos y unitarias |
| `pnpm check:static` | Scripts, docs, agnóstico, fronteras y knip |
| `pnpm test:affected` | Pruebas relacionadas con los archivos cambiados |
| `pnpm test:e2e` | Todos los flujos de Playwright |
| `pnpm test:e2e:smoke` | Flujos críticos de Playwright |
| `pnpm test:unit` | Unitarias de servidor y web |
| `pnpm check:docs` | Verifica los enlaces relativos de la documentación |
| `pnpm check` | Compuerta completa: lint, tipos, scripts, agnóstico, fronteras, knip, tests, base y build |
| `pnpm check:agnostic` | Verifica que el núcleo no nombre plataformas externas |
| `pnpm check:boundaries` | Verifica las reglas de dependencia |
| `pnpm knip` | Detecta código y dependencias sin uso |
| `pnpm test:scripts` | Regresiones de instalación, entornos, Compose, releases, selección de pruebas y recuperación simulada |

`pnpm check` requiere el PostgreSQL de `pnpm test:db:start`. Los valores de pruebas locales
son ficticios y predeterminados; CI puede exportar los de `.env.test.example`. Ninguna prueba carga
archivos privados. Playwright prepara su base `_e2e` y puertos `3101`/`5174`. Durante el desarrollo usa `pnpm check:fast`; la
compuerta completa se reserva para el cierre y para CI.

## Instalación y operación

| Comando | Efecto |
|---|---|
| `./scripts/install.sh` | Genera `.env.dev`, prepara PostgreSQL y migraciones; luego usa `pnpm dev` |
| `./scripts/install.sh --demo` | Instala y carga la semilla demo |
| `./scripts/install.sh --dry-run` | Muestra los pasos sin escribir archivos |
| `docker compose up -d` | Descarga imágenes, migra y arranca la app |
| Actualización | Respaldar, detener app, seleccionar digest, descargar, migrar y arrancar según la guía de operación |
| `docker compose run --rm --no-deps migrate` | Aplica migraciones; detener app antes durante mantenimiento |
| `deploy/scripts/cleanup.sh` | Limpia evidencias abandonadas y aplica retención |
| `deploy/scripts/backup.sh` | Respalda la base |
| `deploy/scripts/backup-evidence.sh` | Respalda el volumen de evidencias |
| `deploy/scripts/restore.sh` | Restaura la base |
| `deploy/scripts/restore-evidence.sh` | Restaura las evidencias |

Ver [`../start/instalacion.md`](../start/instalacion.md) y
[`../guides/operacion.md`](../guides/operacion.md).

La validación operativa Docker real se ejecuta con `AXIA_IMAGE=<imagen-local> bash
scripts/docker-smoke.sh`. Crea y elimina únicamente sus propios proyectos desechables; requiere
una imagen construida del código actual. La prueba de permisos de evidencias puede ejecutarse con
`AXIA_IMAGE=<imagen-local> bash deploy/scripts/evidence-volume.test.sh`.
