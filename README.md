# Axia

Plataforma **propia y autónoma** de seguimiento de tiquets de mantenimiento: en todo momento se
sabe en qué paso está cada tiquet y, si no avanza, **por qué** y en qué estado está ese motivo,
con evidencias en cada paso. Multiusuario, con roles, PWA para escritorio y móvil, con uso sin
conexión en campo, autoalojable y open source.

El núcleo es **agnóstico**: funciona completo por sí solo y ninguna plataforma externa es
requisito, fuente de verdad ni parte de su diseño. Las integraciones son adaptadores opcionales y
aislados.

## Estado del proyecto

Fase 0 (arranque). Ya funciona:

- Monorepo pnpm con `apps/web` (Vite + React + TypeScript, React Compiler) y `packages/shared`.
- Tailwind + shadcn/ui, TanStack Router (rutas por carpetas) y TanStack Query.
- Pantalla de inicio "Axia" y una página de "no encontrado".
- Compuerta de calidad **`pnpm check`** (lint, tipos, independencia, fronteras, pruebas y build).
- CI en GitHub Actions que ejecuta la compuerta.

Todavía **no** está: Supabase local y `pnpm db:types`, PWA/Dexie (modo sin conexión), Playwright,
pgTAP, `knip` y el componente de gráficas. Ver la hoja de ruta y lo pendiente en
[`docs/ESTADO.md`](docs/ESTADO.md).

## Requisitos

- **Node.js LTS** (probado con Node 24).
- **pnpm 12** (se activa con `corepack enable`; la versión está fijada en `package.json`).
- **Git**.
- **Docker** — solo más adelante, para el Supabase local.

## Levantar el proyecto en 10 minutos

```bash
corepack enable
git clone <url-del-repositorio> axia
cd axia
pnpm install      # instala dependencias y configura los hooks de git (Husky)
pnpm dev          # abre http://localhost:5173
```

`pnpm install` ejecuta el script `prepare` de Husky y deja listos los hooks de commit. No hace
falta Supabase para ver la pantalla de inicio.

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo (http://localhost:5173) |
| `pnpm build` | Compila la app a `apps/web/dist` |
| `pnpm lint` | ESLint (incluye los límites de tamaño y `react-hooks`/`jsx-a11y`) |
| `pnpm typecheck` | Verificación de tipos de todo el monorepo |
| `pnpm test` | Pruebas de frontend con Vitest |
| `pnpm format` | Formatea con Prettier |
| `pnpm check:agnostic` | Falla si el núcleo menciona plataformas externas |
| `pnpm check:boundaries` | Reglas de dependencia entre capas (dependency-cruiser) |
| **`pnpm check`** | **Compuerta completa**: lint + typecheck + check:agnostic + check:boundaries + test + build |

`pnpm check` es la fuente única de verdad; el CI y los hooks la usan. Los cambios en la base de
datos (`db:start`, `db:reset`, `db:test`, `db:types`) se añadirán cuando se integre Supabase.

## Estructura del repositorio

```
axia/
├── apps/web/          → PWA (Vite + React + TypeScript)
│   └── src/
│       ├── app/       → providers, router y configuración global
│       ├── routes/    → definición de rutas (TanStack Router, por carpetas)
│       ├── features/  → funcionalidad por dominio (incluye integrations/)
│       ├── components/→ ui (shadcn/ui) y shared
│       └── lib/       → cliente de datos, offline, i18n y utilidades
├── packages/shared/   → tipos y esquemas compartidos
├── scripts/           → verificaciones (p. ej. check:agnostic)
├── docs/              → dominio, convenciones, estado y decisiones (ADR)
└── .github/workflows/ → CI
```

## Documentación

- [`docs/dominio.md`](docs/dominio.md) — flujo de trabajo, modelo conceptual y glosario.
- [`docs/convenciones-codigo.md`](docs/convenciones-codigo.md) — estructura, estilo, pruebas y
  reglas de dependencia (obligatorias).
- [`docs/configuracion-inicial.md`](docs/configuracion-inicial.md) — arranque del entorno y guía de
  despliegue.
- [`docs/ESTADO.md`](docs/ESTADO.md) — estado, hoja de ruta y bloqueos.
- [`docs/decisions/`](docs/decisions/) — decisiones de arquitectura (ADR).
- [`docs/integraciones-y-migracion.md`](docs/integraciones-y-migracion.md) — solo para trabajar en
  importadores e integraciones.

## Contribuir

Se trabaja con ramas cortas (`feat/…`, `fix/…`, `docs/…`, `chore/…`) y **Conventional Commits**,
verificados por un hook al confirmar. Antes de integrar, `pnpm check` debe estar en verde. Los
hooks formatean con Prettier y lint-ean lo preparado (lint-staged).
