# Comandos

Comandos disponibles desde la raíz del repositorio.

## Desarrollo

| Comando | Efecto |
|---|---|
| `pnpm dev` | SPA en `http://localhost:5173`; Vite reenvía `/api` |
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
| `pnpm db:stop` | Detiene PostgreSQL local |
| `pnpm db:reset` | Reconstruye la base con las migraciones |
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
| `pnpm test:scripts` | Prueba el instalador en dry-run y el arranque local del API |

`pnpm check` necesita `MIGRATION_DATABASE_URL`, `AXIA_APP_PASSWORD` y `DATABASE_URL`. Playwright
prepara su propia base con la semilla demo. Durante el desarrollo usa `pnpm check:fast`; la
compuerta completa se reserva para el cierre y para CI.

## Instalación y operación

| Comando | Efecto |
|---|---|
| `./scripts/install.sh` | Instala y levanta el stack local |
| `./scripts/install.sh --demo` | Instala y carga la semilla demo |
| `./scripts/install.sh --dry-run` | Muestra los pasos sin escribir archivos |
| `docker compose up -d` | Descarga imágenes, migra y arranca la app |
| `docker compose pull && docker compose up -d` | Actualiza imágenes y migra |
| `docker compose run --rm migrate` | Aplica migraciones manualmente |
| `deploy/scripts/cleanup.sh` | Limpia evidencias abandonadas y aplica retención |
| `deploy/scripts/backup.sh` | Respalda la base |
| `deploy/scripts/backup-evidence.sh` | Respalda el volumen de evidencias |
| `deploy/scripts/restore.sh` | Restaura la base |
| `deploy/scripts/restore-evidence.sh` | Restaura las evidencias |

Ver [`../start/instalacion.md`](../start/instalacion.md) y
[`../guides/operacion.md`](../guides/operacion.md).
