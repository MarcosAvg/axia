# Axia

Plataforma **propia y autónoma** de seguimiento de tiquets de mantenimiento: en todo momento se
sabe en qué paso está cada tiquet y, si no avanza, **por qué** y en qué estado está ese motivo,
con evidencias en cada paso. Multiusuario, con roles, PWA para escritorio y móvil, con uso sin
conexión en campo, autoalojable y open source.

El núcleo es **agnóstico**: funciona completo por sí solo y ninguna plataforma externa es
requisito, fuente de verdad ni parte de su diseño. Las integraciones son adaptadores opcionales y
aislados.

> **¿Primera vez en este equipo?** Lee [`docs/empezar-aqui.md`](docs/empezar-aqui.md): requisitos,
> arranque en 5 minutos, cómo continuar entre equipos y solución de problemas.

## Estado del proyecto

**Fases 1 a 5 cerradas.** Ya funciona:

- Monorepo pnpm con `apps/web` (Vite + React + TypeScript, React Compiler) y `packages/shared`.
- Tailwind + shadcn/ui, TanStack Router (rutas por carpetas), TanStack Query y React Hook Form + Zod.
- **Base de datos núcleo** (Fase 1): catálogos, motivos jerárquicos, roles/permisos configurables,
  tiquets con folio e historial, ruteo con ofertas, pausas, recaptura, reclamaciones, duplicados,
  tramos de tiempo, notificaciones, RLS de lectura y vistas base de indicadores; 391 pruebas pgTAP.
- **Autenticación y estructura** (Fase 2): inicio de sesión sin auto-registro, perfil automático,
  RPC `me()` (perfil/roles/permisos) y layout con rutas protegidas por permiso.
- **Operación** (Fase 3A): alta de tiquets con catálogos y **aviso de duplicados**, lista con filtros
  y paginación en la URL, detalle con **línea de tiempo**, **bandeja del supervisor** (`/inbox`) y
  **vista del técnico** (`/mi-trabajo`) con acciones por estado/permiso y **evidencia** (bucket
  privado con URL firmada); incluye **recaptura, reclamaciones, marcar duplicado, reactivación,
  reasignar supervisor y agregar auxiliares**.
- **Administración** (Fase 3B): **catálogos y motivos** (`/admin/catalogos`), **roles y permisos**
  con matriz y ámbito (`/admin/roles`), **usuarios** con roles y vínculos (`/admin/usuarios`),
  **ámbitos y designaciones** (`/admin/ambitos`) y **configuración de la instancia**
  (`/admin/configuracion`); escritura por políticas RLS según permiso.
- **Supabase local** (Postgres, Auth, Storage y Studio) y tipos generados con `pnpm db:types`.
- **PWA instalable** y modo sin conexión con Dexie: la **evidencia** del técnico se comprime en el
  dispositivo y se sube reanudable **con progreso**, y **sus acciones del tiquet** (iniciar, pausar,
  atender…) se encolan y sincronizan al recuperar la red.
- **Campo sin cuenta** (Fase 4B): **tiempos manuales** registrados y anulados por supervisor/admin
  (atribuidos a un técnico) y **actuar en nombre de** un técnico (proxy) con actor y sujeto
  distinguidos en el historial.
- **Indicadores** (Fase 5A): tiempo laboral por **cobertura de equipo** (Mantenimiento 06–20, resto
  08–17) con zona horaria y festivos oficiales editables, trabajo **en horario y fuera de horario**
  (extra) y vistas de indicadores por dimensión, técnico, motivo, antigüedad, ruteo y duplicados.
- **Calendarios** (Fase 5B-0): administración en `/admin/calendarios` (franjas semanales y festivos),
  calendario por equipo y por defecto, y las fechas de la interfaz en la zona de la institución.
- **Tablero de métricas** (Fase 5B): `/metricas` con KPI, volumen por día, promedio por dimensión,
  pausas por motivo, aging, **duplicados** (tiempo hasta marcarse, alertas y tasa), **satisfacción**
  promedio y **cumplimiento de SLA**, con filtros de fecha/dimensión y exportación CSV/XLSX (Recharts).
- **Fundación de interfaz** (Fase 5, sub-fase 5C): shadcn/ui completo (primitivas, `Sheet`/`Dialog`,
  `Table`, `Tabs`, `Badge`, `Switch`/`Checkbox`), primitivas `field` para formularios, iconos
  `lucide` y avisos con `sonner`.
- **Importación** (Fase 6A/6B): infraestructura genérica (`/admin/integraciones`) y **adaptador
  CSV/Excel** con dry run, resolución de alias/estatus e importación idempotente; los adaptadores de
  fuentes externas viven **aislados** del núcleo.
- **Despliegue** (Fase 7): `deploy/` con Caddy, compose de Supabase autoalojado, scripts de
  migración/publicación y respaldo/restauración, y un runbook; **tú lo ejecutas**. Ver
  [`deploy/README.md`](deploy/README.md). Guía de correo/push/escalamiento en
  [`docs/notificaciones-push.md`](docs/notificaciones-push.md).
- Compuerta de calidad **`pnpm check`** (lint, tipos, independencia, fronteras, knip, pruebas,
  pgTAP y build) y CI en GitHub Actions.

**Todas las fases (0–7) están cerradas.** Lo que queda es operativo: desplegar y activar
correo/push/escalamiento cuando haya infraestructura. Ver la hoja de ruta en
[`docs/ESTADO.md`](docs/ESTADO.md).

## Requisitos

- **Node.js LTS** (probado con Node 24).
- **pnpm 12** (se activa con `corepack enable`; la versión está fijada en `package.json`).
- **Git**.
- **Docker** — necesario para el Supabase local (`pnpm db:start`). En Linux, tu usuario debe
  pertenecer al grupo `docker`.

## Levantar el proyecto en 10 minutos

```bash
corepack enable
git clone <url-del-repositorio> axia
cd axia
pnpm install      # instala dependencias y configura los hooks de git (Husky)
pnpm db:start      # levanta Supabase local (la primera vez descarga las imágenes)
pnpm db:reset      # aplica migraciones y semilla
pnpm env:local     # escribe apps/web/.env.local desde el Supabase local
pnpm --filter @axia/web exec playwright install chromium   # navegador para la prueba E2E
pnpm dev          # abre http://localhost:5173
```

`pnpm install` ejecuta el script `prepare` de Husky y deja listos los hooks de commit.

Para trabajar con la base de datos local:

```bash
pnpm db:start     # levanta Supabase local (la primera vez descarga las imágenes)
pnpm db:reset     # aplica migraciones y semilla
pnpm env:local    # regenera apps/web/.env.local (o hazlo a mano, ver .env.example)
```

`pnpm env:local` escribe `apps/web/.env.local` (que no se sube al repositorio) a partir de
`pnpm db:start`; también puedes copiar `VITE_SUPABASE_URL` y la clave pública a mano
(ver `apps/web/.env.example`).

**Usuarios demo** (solo entorno local, ficticios; contraseña `AxiaDemo2026!`):
`admin@axia.test`, `supervisor@axia.test`, `tecnico@axia.test` y `solicitante@axia.test`. El alta de
cuentas es solo por administrador o invitación: **no hay auto-registro**.

El build de producción (`pnpm build`) genera el service worker y el manifest en
`apps/web/dist`; los iconos de `apps/web/public/` son **provisionales** hasta que la
institución entregue el logo.

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo (http://localhost:5173) |
| `pnpm build` | Compila la app a `apps/web/dist` |
| `pnpm lint` | ESLint (incluye los límites de tamaño y `react-hooks`/`jsx-a11y`) |
| `pnpm typecheck` | Verificación de tipos de todo el monorepo |
| `pnpm test` | Pruebas: Vitest (unitarias/frontend) + Playwright (flujos de sesión) |
| `pnpm format` | Formatea con Prettier |
| `pnpm db:start` / `pnpm db:stop` | Levanta/apaga el Supabase local |
| `pnpm db:reset` | Reconstruye la base local (migraciones + semilla) |
| `pnpm db:test` | Pruebas de base de datos con pgTAP |
| `pnpm db:types` | Regenera los tipos de TypeScript desde la base local |
| `pnpm env:local` | Escribe `apps/web/.env.local` desde el Supabase local |
| `pnpm check:agnostic` | Falla si el núcleo menciona plataformas externas |
| `pnpm check:boundaries` | Reglas de dependencia entre capas (dependency-cruiser) |
| `pnpm knip` | Código y dependencias sin uso |
| **`pnpm check`** | **Compuerta completa**: lint + typecheck + check:agnostic + check:boundaries + knip + test + db:test + build |

`pnpm check` es la fuente única de verdad; el CI y los hooks la usan. Como incluye `db:test`,
requiere que el Supabase local esté levantado (`pnpm db:start`).

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
├── deploy/            → despliegue en producción (se puebla en la Fase 7)
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
