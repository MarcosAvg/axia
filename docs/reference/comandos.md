# Comandos

Ejecutar desde la raíz del checkout. Preparación del entorno en [desarrollo](../start/desarrollo.md);
instalación de una instancia en [deploy](../../deploy/README.md). El manifiesto `package.json`
contiene los scripts ejecutables; esta referencia explica sus efectos.

## Desarrollo y calidad

| Comando | Efecto |
|---|---|
| `pnpm dev` | Prepara PostgreSQL/migraciones y arranca API/web con recarga |
| `pnpm dev:api` | Arranca solo el watcher API; exige base y configuración preparadas |
| `pnpm build` | Compila servidor y SPA |
| `pnpm lint` / `pnpm typecheck` | ESLint / TypeScript del monorepo |
| `pnpm format` | Formatea fuentes; Markdown escrito a mano se conserva |
| `pnpm test:unit` | Vitest de servidor y web, sin integración DB ni navegador |
| `pnpm test:compiler` | Pruebas del formulario de configuración con React Compiler activo |
| `pnpm test` | Vitest y Playwright; no incluye por sí solo `db:test` |
| `pnpm test:affected` | Selecciona pruebas desde cambios Git; usa compuerta completa si hay borrados de código, infraestructura o dudas |
| `pnpm test:e2e:smoke` / `pnpm test:e2e` | Flujos críticos / todos los flujos de navegador |
| `pnpm test:visual` | Regresión visual opcional; usa el entorno E2E |
| `pnpm check:fast` | Lint, tipos y unitarias para el ciclo local |
| `pnpm check:static` | Scripts, enlaces, fronteras y knip |
| `pnpm check` | Compuerta completa: estáticos, pruebas, PostgreSQL y build |

## Base local

| Comando | Efecto |
|---|---|
| `pnpm db:start` / `pnpm db:stop` | Inicia/detiene PostgreSQL de desarrollo |
| `pnpm test:db:start` / `pnpm test:db:stop` | Inicia/retira únicamente PostgreSQL desechable de pruebas |
| `pnpm db:test` | Ejecuta integración contra PostgreSQL real; reconstruye la base exclusiva de pruebas |
| `pnpm db:demo -- --demo` | Carga demo explícita local; no se ejecuta en producción |
| `pnpm db:reset -- --development` | Borra y reconstruye deliberadamente una base local `_dev` |
| `pnpm db:indexes` | Auditoría de índices; el script carga `.env` automáticamente, ver [limitación](rendimiento-postgres.md) |
| `pnpm db:cleanup` | Retención de sesiones, intentos y avisos |
| `pnpm db:cleanup-evidence` | Limpia subidas abandonadas, sin borrar evidencia lista |
| `pnpm db:cleanup-attachments` | Limpia preparaciones de adjuntos sin ligar |
| `pnpm db:duplicates` | Recalcula las alertas de posible duplicado de los tiquets abiertos |
| `pnpm db:audit:time` | Reporte de solo lectura sobre cobertura, duraciones negativas, desfase y alertas de tiempo |

`check`, `db:test` y las suites de navegador requieren el PostgreSQL de pruebas iniciado. Usan
valores locales ficticios por defecto, sin descubrir dotenv privados. `test:unit` y `check:fast`
no requieren ese contenedor. No ejecutar varias suites que reconstruyan la misma base a la vez.

## Comprobaciones individuales

| Comando | Verificación |
|---|---|
| `pnpm check:docs` | Enlaces relativos en documentación fuente |
| `pnpm check:boundaries` | Fronteras entre capas y ausencia de ciclos |
| `pnpm knip` | Código y dependencias sin uso |
| `pnpm test:scripts` | Instalación, entornos, Compose, paquete de release y recuperación simulada |

## Imagen y operación

Los comandos de instalación, actualización, backup y recuperación tienen un único procedimiento
en [instalación](../../deploy/README.md) y [operación](../guides/operacion.md). Para copias completas
se usa `backup-all.sh` / `restore-all.sh`; las utilidades individuales no coordinan base y fotos.

El smoke local requiere una imagen construida del checkout y crea únicamente sus proyectos
Docker desechables. En CI se construye antes de ejecutarlo:

```bash
docker build -f apps/server/Dockerfile --target app -t axia-app:local .
AXIA_IMAGE=axia-app:local bash scripts/docker-smoke.sh
```

`AXIA_IMAGE=axia-app:local bash deploy/scripts/evidence-volume.test.sh` comprueba permisos de
archivos con la imagen. Estas pruebas Docker se ejecutan por separado de las suites de navegador.
