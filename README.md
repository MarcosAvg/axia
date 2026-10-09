# Axia

[![CI](https://github.com/MarcosAvg/axia/actions/workflows/ci.yml/badge.svg)](https://github.com/MarcosAvg/axia/actions/workflows/ci.yml)
[![Licencia: MIT](https://img.shields.io/badge/licencia-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-24-brightgreen.svg)](.nvmrc)

Plataforma **propia y autónoma** de seguimiento de tiquets de mantenimiento: en todo momento se sabe
en qué paso está cada tiquet y, si no avanza, **por qué** y en qué estado está ese motivo, con
evidencias en cada paso. Multiusuario, con roles, PWA para escritorio y móvil, con uso sin conexión
en campo, autoalojable y open source.

El núcleo es **agnóstico**: funciona completo por sí solo y ninguna plataforma externa es requisito,
fuente de verdad ni parte de su diseño. Las integraciones son adaptadores opcionales y aislados.

> **Puesta en marcha y trabajo en equipo:** ver [`docs/empezar-aqui.md`](docs/empezar-aqui.md)
> (requisitos, arranque, continuidad entre equipos y solución de problemas).

## Tabla de contenidos

- [Descripción](#descripción)
- [Características](#características)
- [Arquitectura](#arquitectura)
- [Requisitos](#requisitos)
- [Puesta en marcha](#puesta-en-marcha)
- [Comandos](#comandos)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Documentación](#documentación)
- [Despliegue](#despliegue)
- [Contribución](#contribución)
- [Licencia](#licencia)

## Descripción

Axia registra, asigna, ejecuta y mide tiquets de mantenimiento. Cada cambio de estado queda en un
historial de solo agregar y, cuando un tiquet no avanza, se registra el motivo y su estado con
evidencia. El proyecto está pensado para operar en campo, incluso sin conexión, y para instalarse en
infraestructura propia.

## Características

- Monorepo pnpm con `apps/web` (Vite + React + TypeScript, React Compiler) y `packages/shared`.
- Tailwind + shadcn/ui, TanStack Router (rutas por carpetas), TanStack Query y React Hook Form + Zod.
- **Base de datos núcleo** (Fase 1): catálogos, motivos jerárquicos, roles y permisos configurables,
  tiquets con folio e historial, ruteo con ofertas, pausas, recaptura, reclamaciones, duplicados,
  tramos de tiempo, notificaciones, RLS de lectura y vistas base de indicadores.
- **Autenticación y estructura** (Fase 2): inicio de sesión sin auto-registro, perfil automático,
  RPC `me()` (perfil, roles y permisos) y layout con rutas protegidas por permiso.
- **Operación** (Fase 3A): alta de tiquets con catálogos y **aviso de duplicados**, lista con filtros
  y paginación en la URL, detalle con **línea de tiempo**, **bandeja del supervisor** (`/inbox`) y
  **vista del técnico** (`/mi-trabajo`) con acciones por estado y **evidencia** (bucket privado con
  URL firmada). Incluye recaptura, reclamaciones, marcar duplicado, reactivación, reasignar
  supervisor y agregar auxiliares.
- **Administración** (Fase 3B): **catálogos y motivos** (`/admin/catalogos`), **roles y permisos**
  con matriz y ámbito (`/admin/roles`), **usuarios** con roles y vínculos (`/admin/usuarios`),
  **ámbitos y designaciones** (`/admin/ambitos`) y **configuración de la instancia**
  (`/admin/configuracion`); escritura por políticas RLS según permiso.
- **Supabase local** (Postgres, Auth, Storage y Studio) y tipos generados con `pnpm db:types`.
- **PWA instalable** y modo sin conexión con Dexie: la **evidencia** del técnico se comprime en el
  dispositivo y se sube reanudable **con progreso**, y **sus acciones del tiquet** (iniciar, pausar,
  atender, etc.) se encolan y sincronizan al recuperar la red.
- **Campo sin cuenta** (Fase 4B): **tiempos manuales** registrados y anulados por supervisor o
  administrador (atribuidos a un técnico) y **actuar en nombre de** un técnico (proxy) con actor y
  sujeto distinguidos en el historial.
- **Indicadores** (Fase 5A): tiempo laboral por **cobertura de equipo** (Mantenimiento 06–20, resto
  08–17) con zona horaria y festivos oficiales editables, trabajo **en horario y fuera de horario**
  (extra) y vistas por dimensión, técnico, motivo, antigüedad, ruteo y duplicados.
- **Calendarios** (Fase 5B-0): administración en `/admin/calendarios` (franjas semanales y festivos),
  calendario por equipo y por defecto, y las fechas de la interfaz en la zona de la institución.
- **Tablero de métricas** (Fase 5B): `/metricas` con KPI, volumen por día, promedio por dimensión,
  pausas por motivo, antigüedad, **duplicados** (tiempo hasta marcarse, alertas y tasa),
  **satisfacción** promedio y **cumplimiento de SLA**, con filtros de fecha y dimensión y exportación
  CSV/XLSX (Recharts).
- **Fundación de interfaz** (Fase 5C): shadcn/ui completo (primitivas, `Sheet`/`Dialog`, `Table`,
  `Tabs`, `Badge`, `Switch`/`Checkbox`), primitivas `field` para formularios, iconos `lucide` y
  avisos con `sonner`.
- **Importación** (Fase 6): infraestructura genérica (`/admin/integraciones`), **adaptador CSV/Excel**
  con simulación, resolución de alias y estatus, importación idempotente, reconstrucción de la línea
  de tiempo y convivencia con el sistema de origen; los adaptadores viven **aislados** del núcleo.
- **Despliegue** (Fase 7): `deploy/` con un **`docker-compose.yml`** de la aplicación (frontend y
  migraciones, con **configuración en runtime** e imágenes publicables), scripts de
  respaldo/restauración, un runbook y un **contrato de reverse proxy** (con ejemplos opcionales;
  Axia no impone ninguno). El backend Supabase se despliega aparte (Cloud o autoalojado).
- Compuerta de calidad **`pnpm check`** (lint, tipos, independencia, fronteras, knip, pruebas, pgTAP
  y build) y CI en GitHub Actions.

## Arquitectura

El repositorio es un monorepo pnpm:

- **`apps/web`**: la PWA (Vite, React, TypeScript). Funcionalidad por dominio en `features/`; el
  cliente de datos vive en `features/*/api` y `lib/`.
- **`packages/shared`**: tipos y esquemas compartidos, incluidos los tipos generados de la base.
- **`supabase`**: migraciones, semillas, funciones y pruebas pgTAP.
- **`deploy`**: infraestructura de producción (Docker Compose, respaldos y runbook).

El núcleo no depende de plataformas externas. Las integraciones se aíslan en
`apps/web/src/features/integrations/` y `supabase/functions/integration-*`. La regla se verifica con
`pnpm check:agnostic`.

## Requisitos

| Requisito | Detalle |
|---|---|
| Node.js | LTS (probado con Node 24; ver `.nvmrc`) |
| pnpm | 12 (se activa con `corepack enable`; versión fijada en `package.json`) |
| Git | — |
| Docker | Necesario para el Supabase local (`pnpm db:start`). En Linux, el usuario debe pertenecer al grupo `docker` |

## Puesta en marcha

```bash
corepack enable
git clone <url-del-repositorio> axia
cd axia
pnpm install      # instala dependencias y configura los hooks de git (Husky)
pnpm db:start     # levanta Supabase local (la primera vez descarga las imágenes)
pnpm db:reset     # aplica migraciones y semilla
pnpm env:local    # escribe apps/web/.env.local desde el Supabase local
pnpm --filter @axia/web exec playwright install chromium   # navegador para la prueba E2E
pnpm dev          # abre http://localhost:5173
```

`pnpm install` ejecuta el script `prepare` de Husky y deja listos los hooks de confirmación.

Para trabajar con la base de datos local:

```bash
pnpm db:start     # levanta Supabase local (la primera vez descarga las imágenes)
pnpm db:reset     # aplica migraciones y semilla
pnpm env:local    # regenera apps/web/.env.local (alternativa manual en .env.example)
```

`pnpm env:local` escribe `apps/web/.env.local` (no se incorpora al repositorio) a partir de
`pnpm db:start`. Como alternativa, es posible copiar `VITE_SUPABASE_URL` y la clave pública
manualmente (ver `apps/web/.env.example`).

**Usuarios demo** (solo entorno local, ficticios; contraseña `AxiaDemo2026!`), con sus nombres de
lectura: `admin@axia.test` (Rosa Delgado), `supervisor@axia.test` (Sergio Ramírez),
`tecnico@axia.test` (Luis Gómez) y `solicitante@axia.test` (Ana Pérez). El alta de cuentas es solo
por administrador o invitación: **no hay auto-registro**.

El build de producción (`pnpm build`) genera el service worker y el manifest en `apps/web/dist`; los
iconos de `apps/web/public/` son **provisionales** hasta que la institución entregue el logotipo.

## Comandos

| Comando | Descripción |
|---|---|
| `pnpm dev` | Servidor de desarrollo (http://localhost:5173) |
| `pnpm build` | Compila la aplicación a `apps/web/dist` |
| `pnpm lint` | ESLint (incluye límites de tamaño, `react-hooks` y `jsx-a11y`) |
| `pnpm typecheck` | Verificación de tipos de todo el monorepo |
| `pnpm test` | Pruebas: Vitest y Playwright |
| `pnpm format` | Formatea con Prettier |
| `pnpm db:start` / `pnpm db:stop` | Levanta o apaga el Supabase local |
| `pnpm db:reset` | Reconstruye la base local (migraciones y semilla) |
| `pnpm db:test` | Pruebas de base de datos con pgTAP |
| `pnpm db:types` | Regenera los tipos de TypeScript desde la base local |
| `pnpm env:local` | Escribe `apps/web/.env.local` desde el Supabase local |
| `pnpm check:agnostic` | Falla si el núcleo menciona plataformas externas |
| `pnpm check:boundaries` | Reglas de dependencia entre capas (dependency-cruiser) |
| `pnpm knip` | Código y dependencias sin uso |
| **`pnpm check`** | **Compuerta completa**: lint + typecheck + check:agnostic + check:boundaries + knip + test + db:test + build |

`pnpm check` es la fuente única de verdad; el CI y los hooks la usan. Como incluye `db:test`,
requiere el Supabase local levantado (`pnpm db:start`).

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
├── packages/shared/   → tipos y esquemas compartidos (incluye database.types.ts)
├── supabase/          → migraciones, semillas, funciones y pruebas pgTAP
├── deploy/            → despliegue en producción (Docker Compose, respaldos y runbook)
├── scripts/           → verificaciones (p. ej. check:agnostic)
├── docs/              → dominio, convenciones, estado y decisiones (ADR)
└── .github/workflows/ → CI
```

## Documentación

El índice completo está en [`docs/README.md`](docs/README.md).

| Documento | Contenido |
|---|---|
| [`docs/empezar-aqui.md`](docs/empezar-aqui.md) | Requisitos, arranque y continuidad entre equipos |
| [`docs/dominio.md`](docs/dominio.md) | Flujo de trabajo, modelo conceptual y glosario |
| [`docs/especificacion-negocio.md`](docs/especificacion-negocio.md) | Fuente de verdad del negocio |
| [`docs/modelo-datos.md`](docs/modelo-datos.md) | Diseño de la base del núcleo |
| [`docs/convenciones-codigo.md`](docs/convenciones-codigo.md) | Estructura, estilo y reglas de dependencia |
| [`docs/estilo-documentacion.md`](docs/estilo-documentacion.md) | Normas de redacción de la documentación |
| [`docs/configuracion-inicial.md`](docs/configuracion-inicial.md) | Arranque del entorno y despliegue |
| [`docs/notificaciones-push.md`](docs/notificaciones-push.md) | Correo, push y escalamiento |
| [`docs/ESTADO.md`](docs/ESTADO.md) | Estado, hoja de ruta y bloqueos |
| [`docs/decisions/`](docs/decisions/) | Decisiones de arquitectura (ADR) |

## Despliegue

La aplicación se despliega con Docker Compose (`deploy/docker-compose.yml`) contra un Supabase
aparte (Cloud o autoalojado). El procedimiento completo, el contrato de reverse proxy y los respaldos
están en [`deploy/README.md`](deploy/README.md).

## Contribución

Las normas de ramas, commits y compuerta de calidad están en [`CONTRIBUTING.md`](CONTRIBUTING.md). El
proyecto se rige por [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) y los problemas de seguridad se
reportan según [`SECURITY.md`](SECURITY.md).

## Licencia

Distribuido bajo la licencia MIT. Ver [`LICENSE`](LICENSE).
