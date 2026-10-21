# Comandos

Comandos disponibles desde la raíz del repositorio.

## Desarrollo

| Comando | Efecto |
|---|---|
| `pnpm dev` | SPA en `http://localhost:5173`; Vite reenvía `/api` |
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
| `pnpm db:next:demo -- --demo` | Carga la semilla demo local |
| `pnpm db:next:check` | Ejecuta `drizzle-kit check` |
| `pnpm db:next:indexes` | Audita índices y claves foráneas |

## Calidad

| Comando | Efecto |
|---|---|
| `pnpm check` | Compuerta completa: lint, tipos, scripts, agnóstico, fronteras, knip, tests, base y build |
| `pnpm check:agnostic` | Verifica que el núcleo no nombre plataformas externas |
| `pnpm check:boundaries` | Verifica las reglas de dependencia |
| `pnpm knip` | Detecta código y dependencias sin uso |
| `pnpm test:scripts` | Prueba el instalador en modo dry-run |

`pnpm check` necesita `MIGRATION_DATABASE_URL`, `AXIA_APP_PASSWORD` y `DATABASE_URL`. Playwright
prepara su propia base con la semilla demo.

## Instalación y operación

| Comando | Efecto |
|---|---|
| `./scripts/install.sh` | Instala y levanta el stack local |
| `./scripts/install.sh --demo` | Instala y carga la semilla demo |
| `./scripts/install.sh --dry-run` | Muestra los pasos sin escribir archivos |
| `docker compose run --rm migrate` | Aplica migraciones |
| `deploy/scripts/backup.sh` | Respalda la base |
| `deploy/scripts/backup-evidence.sh` | Respalda el volumen de evidencias |
| `deploy/scripts/restore.sh` | Restaura la base |
| `deploy/scripts/restore-evidence.sh` | Restaura las evidencias |

Ver [`../start/instalacion.md`](../start/instalacion.md) y
[`../guides/operacion.md`](../guides/operacion.md).
