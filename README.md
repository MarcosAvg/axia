# Axia

[![CI](https://github.com/MarcosAvg/axia/actions/workflows/ci.yml/badge.svg)](https://github.com/MarcosAvg/axia/actions/workflows/ci.yml)
[![Licencia: MIT](https://img.shields.io/badge/licencia-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-24-brightgreen.svg)](.nvmrc)

Plataforma **propia y autónoma** de seguimiento de tiquets de mantenimiento: en todo momento se sabe
en qué paso está cada tiquet y, si no avanza, **por qué** y en qué estado está ese motivo, con
evidencias en cada paso. Multiusuario, con roles, PWA para escritorio y móvil, uso sin conexión en
campo, autoalojable y open source.

El núcleo es **agnóstico**: funciona completo por sí solo. Las integraciones con otros sistemas son
adaptadores opcionales y no forman parte del núcleo.

## Arquitectura

- **`apps/web`**: PWA en Vite + React + TypeScript. Las rutas se organizan con TanStack Router y los
  datos con TanStack Query. Los componentes no llaman al servidor: usan `features/*/api`.
- **`apps/server`**: un único servidor Fastify con PostgreSQL 17, Drizzle, autenticación local,
  API de tiquets, SSE, evidencias TUS/Sharp y sincronización offline.
- **`deploy`**: scripts de operación y respaldos. El despliegue real lo ejecuta la persona.
- **`docs`**: especificación de negocio, modelo de datos, convenciones, ADR y estado del proyecto.

No hay RLS en esta versión: la autorización vive en el servidor y se aplica con `can`/`canAct` y
repositorios con alcance. Cada cambio de estado pasa por una acción del servidor y escribe un evento
en la misma transacción.

## Requisitos

| Requisito | Detalle |
|---|---|
| Node.js | LTS (probado con Node 24; ver `.nvmrc`) |
| pnpm | 12, activado con `corepack enable` |
| Git | — |
| Docker | PostgreSQL local, migraciones e imágenes |
| openssl | Generación de secretos en la instalación |

## Puesta en marcha local

```bash
corepack enable
pnpm install
./scripts/install.sh --demo
pnpm dev
```

El instalador genera `.env` con secretos aleatorios, levanta PostgreSQL, aplica las migraciones y
arranca la API. Con `--demo` carga usuarios y tiquets ficticios. La API queda en
`http://127.0.0.1:3000` y el SPA en `http://localhost:5173`; Vite reenvía `/api` al servidor.

La primera cuenta de administración se crea desde la pantalla de primer arranque (o con
`POST /api/setup`). La contraseña debe tener al menos 12 caracteres.

### Usuarios demo

La semilla demo genera `demo.admin`, `demo.supervisor`, `demo.technician` y `demo.requester`. La
contraseña se toma de `AXIA_DEMO_PASSWORD` o se genera una sola vez al ejecutar la semilla. **No hay
contraseña fija en el repositorio.**

## Comandos

| Comando | Descripción |
|---|---|
| `pnpm dev` | SPA en desarrollo (http://localhost:5173) |
| `pnpm build` | Compila servidor y SPA |
| `pnpm lint` / `pnpm typecheck` | ESLint y TypeScript en todo el monorepo |
| `pnpm test` | Vitest y Playwright |
| `pnpm db:start` / `pnpm db:stop` | Levanta o detiene PostgreSQL local |
| `pnpm db:reset` | Reconstruye la base local con migraciones |
| `pnpm db:test` | Pruebas de integración contra PostgreSQL real |
| `pnpm db:next:demo -- --demo` | Carga la semilla demo en una base local |
| `pnpm check:agnostic` | Verifica que el núcleo no mencione plataformas externas |
| `pnpm check:boundaries` | Reglas de dependencia entre capas |
| `pnpm knip` | Código y dependencias sin uso |
| **`pnpm check`** | **Compuerta completa**: lint, tipos, scripts, fronteras, knip, Vitest, Playwright, PostgreSQL real y build |

`pnpm check` necesita `MIGRATION_DATABASE_URL`, `AXIA_APP_PASSWORD` y `DATABASE_URL`; en CI se
configuran contra el servicio PostgreSQL. Playwright prepara su propia base con la semilla demo.

Ejemplo local:

```bash
MIGRATION_DATABASE_URL='postgres://axia_owner:owner-test@127.0.0.1:55433/axia_test' \
AXIA_APP_PASSWORD='test-app-password' \
DATABASE_URL='postgres://axia_app:test-app-password@127.0.0.1:55433/axia_test' \
pnpm check
```

## Estructura

```
axia/
├── apps/web/          → PWA
├── apps/server/       → Fastify, Drizzle, API, SSE y evidencia
├── deploy/            → scripts de operación y respaldos
├── docs/              → negocio, convenciones, ADR y estado
├── scripts/           → instalación, E2E y verificaciones
└── .github/workflows/ → CI
```

## Documentación

| Documento | Contenido |
|---|---|
| [`docs/empezar-aqui.md`](docs/empezar-aqui.md) | Requisitos, arranque y continuidad |
| [`docs/especificacion-negocio.md`](docs/especificacion-negocio.md) | Fuente de verdad del negocio |
| [`docs/dominio.md`](docs/dominio.md) | Flujo, modelo conceptual y glosario |
| [`docs/modelo-datos.md`](docs/modelo-datos.md) | Diseño de la base |
| [`docs/migracion/instalacion-autoalojada.md`](docs/migracion/instalacion-autoalojada.md) | Instalación, secretos y respaldos |
| [`docs/convenciones-codigo.md`](docs/convenciones-codigo.md) | Estructura y estilo |
| [`docs/ESTADO.md`](docs/ESTADO.md) | Estado y decisiones abiertas |
| [`docs/decisions/`](docs/decisions/) | ADR |

## Despliegue

La instalación y los respaldos están en
[`docs/migracion/instalacion-autoalojada.md`](docs/migracion/instalacion-autoalojada.md). El
despliegue en un servidor real lo ejecuta la persona; el agente no toca producción ni la nube.

## Contribución

Las normas de ramas, commits y compuerta están en [`CONTRIBUTING.md`](CONTRIBUTING.md). El proyecto
se rige por [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md); los problemas de seguridad se reportan según
[`SECURITY.md`](SECURITY.md).

## Licencia

MIT. Ver [`LICENSE`](LICENSE).
