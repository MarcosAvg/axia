# Axia — Estado del proyecto

> El agente lee este archivo al iniciar cada sesión y lo actualiza al terminar cada tarea.
> Es la memoria del proyecto entre sesiones. Mantenlo corto y verídico.

**Última actualización:** 2026-10-07
**Fase actual:** 0 — Arranque del entorno

## En curso

_(vacío)_ — Antes de empezar una tarea, escribe aquí un plan de 3 a 7 líneas.

## Hecho

- Reglas del agente (`AGENTS.md`), convenciones (`docs/convenciones-codigo.md`), dominio del
  núcleo (`docs/dominio.md`) e integraciones y migración (`docs/integraciones-y-migracion.md`)
  redactados por la persona con ayuda externa.
- Decisiones de stack tomadas: Vite + React + TypeScript (SPA/PWA), Supabase (nube y
  autoalojado), Recharts vía shadcn/ui, Dexie para modo sin conexión, monorepo pnpm.
- Decisión de arquitectura: **Axia es una plataforma propia y agnóstica**. El núcleo no depende
  de ninguna plataforma externa; las integraciones son adaptadores opcionales y aislados.
- **Proyecto base (Fase 0)**: monorepo pnpm con `apps/web` (`@axia/web`, Vite + React +
  TypeScript) y `packages/shared` (`@axia/shared`); pantalla de inicio "Axia"; scripts raíz
  `dev`, `build`, `lint`, `typecheck`, `test`, `format` y `check`; `.gitignore` y `.env.example`.
- **React Compiler activo** en Vite con `reactCompilerPreset()` + `@rolldown/plugin-babel`
  (integración oficial para `@vitejs/plugin-react` v6).
- **Herramientas de cumplimiento activas** (`docs/convenciones-codigo.md`): TypeScript estricto
  (`strict`, `noUncheckedIndexedAccess`, `noFallthroughCasesInSwitch`) en un `tsconfig.base.json`
  compartido por todos los paquetes; ESLint con `typescript-eslint`, `eslint-plugin-react-hooks`
  y `eslint-plugin-jsx-a11y`, más los límites de tamaño/complejidad y `no-console`,
  `no-explicit-any` y `ban-ts-comment`; Prettier con el script `pnpm format`.
- **Independencia del núcleo verificable** (`pnpm check:agnostic`): `scripts/check-agnostic.mjs`
  busca la lista de `scripts/agnostic-names.json` (`atenda`, `google sheets`, `google drive`),
  sin distinguir mayúsculas, y falla si aparecen fuera de `features/integrations/`,
  `supabase/functions/integration-*/`, `docs/integraciones-y-migracion.md`, `docs/ESTADO.md`,
  `docs/decisions/` y `scripts/`. Ya está dentro de `pnpm check`.
- **Pruebas de frontend (Vitest)**: Vitest + Testing Library + `jest-dom` con entorno jsdom;
  prueba de humo de la pantalla de inicio (`src/App.test.tsx`, "muestra el nombre de la
  aplicación"); `pnpm test` en `apps/web` y en la raíz, e incluido en `pnpm check`.
- **Estructura por features** en `apps/web/src` (`app/`, `features/` con `features/integrations/`,
  `components/ui`, `components/shared`, `lib/`; carpetas vacías con `.gitkeep`) y **reglas de
  dependencia** con dependency-cruiser (`.dependency-cruiser.cjs` → `pnpm check:boundaries`):
  features solo importan el `index.ts` de otro feature; `components/` y `lib/` no importan de
  `features/`/`routes/`; el núcleo no importa de `features/integrations/`; sin ciclos; el cliente
  de Supabase solo desde `features/*/api` y `lib/`; `domain/` sin React/TanStack/Supabase/Dexie.
  Ya está dentro de `pnpm check`.
- **Tailwind + shadcn/ui** (guía oficial para Vite, preset `radix-nova`): plugin
  `@tailwindcss/vite`; alias `@` → `src` en TypeScript, Vite y Vitest; componentes `button`,
  `card`, `input` y `label` en `components/ui/`; pantalla de inicio con `Card` y `Button` y textos
  en `lib/i18n.ts` (es-MX). **Sin `chart`/Recharts** todavía.
- **Enrutado por carpetas + TanStack Query**: `@tanstack/router-plugin` (antes que el de React);
  rutas `__root` (con `notFoundComponent`), `index` ("/") y el caso de no encontrado; `QueryClient`
  y `QueryClientProvider` en `app/` (`query-client.ts`, `providers.tsx`, `router.tsx`);
  `routeTree.gen.ts` versionado e ignorado por linter/formatter. Pruebas de "/" y de ruta
  inexistente.
- **Automatización de la compuerta**: Husky (`.husky/pre-commit` → `lint-staged`,
  `.husky/commit-msg` → `commitlint`), lint-staged (Prettier + ESLint sobre lo preparado) y
  commitlint (Conventional Commits); CI en `.github/workflows/ci.yml` que instala con pnpm y
  ejecuta `pnpm check`.
- **Documentación de arranque**: `README.md` (qué es Axia, requisitos, arranque en 10 minutos y
  comandos) y seis ADR iniciales en `docs/decisions/` (Vite + React con React Compiler, Supabase,
  Recharts en lugar de ECharts, cola offline con Dexie, bloqueos dirigidos por datos e
  independencia del núcleo).
- **Supabase local (Fase 0, tarea 4)**: CLI de Supabase como devDependency (MIT, 2.120.0) y
  `supabase init` (`supabase/config.toml`); scripts `db:start`, `db:stop`, `db:reset`, `db:test`,
  `db:types`; `supabase/seed.sql`. Migración `enable_pgtap` (instala pgTAP en `extensions`) y
  prueba pgTAP de humo (`supabase/tests/database/00_humo.test.sql`), en verde con `pnpm db:test`.
  `pnpm db:reset` limpio. **Cliente tipado**: `pnpm db:types` genera
  `packages/shared/src/database.types.ts` (formateado con Prettier en el mismo script),
  `packages/shared/src/index.ts` los exporta y `apps/web/src/lib/supabase.ts` crea el cliente con
  `@supabase/supabase-js` (MIT); `apps/web/.env.example` documenta las variables. `db:test` se
  sumó a `pnpm check` y el CI levanta Supabase antes de la compuerta.

## Siguiente

Fase 0, tareas restantes: PWA (manifest e iconos, `registerType: 'prompt'`) y esqueleto Dexie
(`outbox`, `evidencias`); Playwright (prueba de humo y flujo del técnico sin conexión); `knip`;
el directorio `deploy/`; y el componente `chart`/Recharts (llega con las métricas).

## Hoja de ruta

El núcleo se construye y se puede usar **sin ninguna integración**. Las integraciones y la
migración van después, sobre un núcleo ya estable.

### Fase 0 — Arranque (sin dependencias de negocio)
- [ ] Monorepo pnpm: `apps/web`, `packages/shared`, `supabase/`, `deploy/`, `docs/`, `scripts/`
      (falta `deploy/`)
- [ ] App Vite + React + TypeScript con Tailwind, shadcn/ui (incluido `chart`/Recharts),
      TanStack Router (rutas por carpetas) y TanStack Query (falta el componente `chart`/Recharts,
      que llega con las métricas)
- [x] Supabase local funcionando, cliente tipado, `pnpm db:types`
- [ ] PWA configurada (manifest, iconos, `registerType: 'prompt'`) y esqueleto Dexie (`outbox`, `evidencias`)
- [ ] Herramientas que hacen cumplir las convenciones: TypeScript estricto, ESLint con los
      límites de tamaño, `dependency-cruiser` o `eslint-plugin-boundaries`, Prettier, knip,
      Husky + lint-staged, commitlint (falta `knip`)
- [x] **`pnpm check:agnostic`**: script con lista configurable de nombres de terceros
      (incluye los nombres de este proyecto de origen) y rutas permitidas
- [ ] Vitest, Playwright y prueba pgTAP de humo (hecho: Vitest y pgTAP; falta Playwright)
- [x] Scripts de raíz, incluido **`pnpm check`** (lint + typecheck + check:agnostic +
      check:boundaries + test + db:test + build)
- [x] CI que ejecuta la compuerta completa (levanta Supabase antes)
- [x] `README.md` (levantar el proyecto en 10 minutos), `.env.example`, `.gitignore`
- [x] ADR iniciales en `docs/decisions/`: Vite + React como SPA, Supabase, Recharts en lugar
      de ECharts, cola offline con Dexie, modelo de bloqueos dirigido por datos, independencia
      del núcleo
- [x] Pantalla de inicio "Axia" visible y `pnpm check` en verde

**Falta para cerrar la Fase 0:** PWA (manifest e iconos) y esqueleto Dexie (`outbox`,
`evidencias`), Playwright, `knip`, el directorio `deploy/` y el componente `chart`/Recharts
(llega con las métricas).

### Fase 1 — Base de datos núcleo
- [ ] Catálogos: edificios, ubicaciones, dependencias, categorías → subcategorías → problemas,
      tipos de servicio, prioridades, canales, técnicos, sistemas externos (`external_systems`)
- [ ] `tickets` (con `ticket_number`), `ticket_assignments`, `ticket_events` (solo agregar),
      `attachments`, `ticket_external_refs`, `user_roles`
- [ ] RLS por rol en todas las tablas, con pruebas pgTAP
- [ ] Vistas de métricas base (`v_ticket_metrics_base`)

### Fase 2 — Transiciones y bloqueos
- [ ] Funciones RPC: crear tiquet, asignar a supervisor, asignar a técnico (autoriza), iniciar,
      resolver, cerrar, rechazar, cancelar, con idempotencia (`client_request_id`)
- [ ] Modelo de bloqueos: tipos, estados, transiciones, campos dinámicos; `on_hold` calculado
- [ ] Pruebas pgTAP de rol incorrecto, transición inválida y repetición idempotente
- [ ] Semilla provisional y ficticia de tipos de bloqueo (ver pregunta 1)

### Fase 3 — Autenticación, roles y estructura de la app
- [ ] Inicio de sesión, perfiles, layout con rutas protegidas por rol (la seguridad real es RLS)

### Fase 4 — Pantallas principales
- [ ] Alta de tiquets con catálogos, lista y detalle con línea de tiempo
- [ ] Vista del técnico (móvil primero), bandeja del supervisor y del encargado
- [ ] Administración de catálogos y de flujos de bloqueo

### Fase 5 — Evidencias y modo sin conexión
- [ ] Captura y compresión de fotos, subida reanudable, cola `outbox`, sincronización
- [ ] Prueba Playwright del flujo del técnico sin conexión

### Fase 6 — Métricas y reportes
- [ ] Vistas avanzadas, tableros con Recharts, exportación CSV/XLSX

### Fase 7 — Integraciones y migración (opcional, aislada del núcleo)
- [ ] Infraestructura genérica de importación: `import_batches`, `import_records`,
      `catalog_aliases`, `import_status_map`, dry run y reporte de calidad de datos
- [ ] Adaptador de importación CSV/Excel de la hoja heredada
- [ ] Verificación: las métricas base coinciden con las cifras actuales de la hoja
- [ ] Otros adaptadores y tareas de sincronización saliente, solo si la persona los pide

### Fase 8 — Producción
- [ ] PWA completa, notificaciones push, despliegue autoalojado (Docker Compose + Caddy),
      respaldos y restauración de prueba, documentación de despliegue
- [ ] (Solo si hace falta) envoltura nativa con Capacitor

## Bloqueos y preguntas para la persona

Ninguna bloquea la Fase 0. Cuando una tarea dependa de una, regístrala aquí con tu pregunta
concreta, opciones y recomendación.

| # | Pregunta | Bloquea | Estado |
|---|---|---|---|
| 1 | Lista inicial de tipos de bloqueo, subestados y campos | Fase 2 (semilla definitiva) | Pendiente |
| 2 | ¿Los solicitantes tendrán cuenta o serán contactos sin cuenta? | Fases 1 y 3 (hay decisión provisional) | Pendiente |
| 3 | Zona horaria de la institución y horario laboral para métricas | Fase 6 | Pendiente |
| 4 | Formato del número de tiquet (consecutivo, con prefijo o año) | Fase 1 | Pendiente |
| 5 | ¿Se requieren tiempos objetivo (SLA) por prioridad o tipo de servicio? | Fase 6 | Pendiente |
| 6 | Valores distintos de la columna ESTATUS de la hoja (solo se conoce `EN PROCESO`) | Fase 7 | Pendiente |
| 7 | ¿La plataforma de origen exporta (CSV/Excel), tiene API o envía correos? | Fase 7 | Pendiente |
| 8 | ¿"Asignación de trabajo" es asignación al técnico o inicio del trabajo? | Fase 7 (hay supuesto provisional) | Pendiente |
| 9 | ¿Más de una pestaña o año en la hoja? ¿Volumen aproximado? | Fase 7 | Pendiente |

## Decisiones registradas

Decisiones provisionales (pendientes de ADR): varios bloqueos simultáneos por tiquet; `on_hold`
calculado; la autorización es la asignación del supervisor al técnico; el solicitante puede ser
usuario o contacto sin cuenta; la prioridad la ajusta el encargado o el supervisor con evento;
al importar, el `ticket_number` conserva el ID original y la secuencia continúa después del mayor.

## Notas de entorno

- Versiones (oct 2026): Node 24.18.0, pnpm 12.8.1, Vite 8.3.3, `@vitejs/plugin-react` 6.1.2,
  React 19.3.0, TypeScript `~6.0.2`, ESLint 9.39.5, `eslint-plugin-react-hooks` 7.1.1,
  `eslint-plugin-jsx-a11y` 6.10.2, `babel-plugin-react-compiler` 1.0.0, `@rolldown/plugin-babel`
  0.2.4, `@babel/core` 8.0.6, Prettier 3.9.9, Vitest 5.0.3, `@testing-library/react` 16.3.3,
  `@testing-library/jest-dom` 7.0.1, jsdom 29.1.1, `supabase` (CLI) 2.120.0,
  `@supabase/supabase-js` 2.117.2.
- **jsdom fijado en `^29`**: se fijó cuando el equipo tenía Node 24.14.1 (jsdom 30 exige
  `^24.15.0`). Ahora el equipo usa Node 24.18.0; revisar el salto a jsdom 30 en otra tarea.
- **ESLint 9, no 10**: `eslint-plugin-jsx-a11y` (última versión, 6.10.2) aún no declara soporte
  para ESLint 10; con ESLint 9 todos los plugins tienen sus peers satisfechos.
- **Prettier ignora `*.md`**: los documentos escritos a mano no se reformatean; `pnpm format`
  actúa solo sobre código y configuración.
- **TypeScript fijado en `~6.0.2`**: `typescript-eslint` 8.71.1 aún no soporta TS 7. Revisar
  cuando haya una versión de `typescript-eslint` compatible con TS 7.
- `@vitejs/plugin-react` v6 **quitó la opción `babel` en línea**: el compilador se integra con
  `reactCompilerPreset()` + `@rolldown/plugin-babel` (guía oficial de React Compiler para Vite).
- Verificación del compilador: en dev, el módulo transformado importa de `react/compiler-runtime`
  y usa `Symbol.for("react.memo_cache_sentinel")`; en el build empaquetado aparece el mismo patrón.
- La plantilla de `create-vite` v9 trae **oxlint**, no ESLint: se reemplazó por ESLint flat
  config con `typescript-eslint`, `@eslint/js` y `eslint-plugin-react-hooks` (`recommended-latest`).
- `pnpm check:agnostic` recorre el árbol (omite `node_modules`, `.git`, `dist`, etc.), salta
  binarios por byte nulo y reporta `archivo:línea` junto con el nombre encontrado.
- dependency-cruiser 18.5.0 (raíz) con `typescript` 6.0.3 a su lado (lo usa como transpiler);
  `tsPreCompilationDeps: true`. Las reglas de dependencias npm coinciden también con la ruta
  resuelta bajo `node_modules` (React, TanStack...), no solo con el nombre del módulo.
- `routeTree.gen.ts` se versiona (como en el quickstart oficial) para que `pnpm typecheck` y CI
  funcionen sin ejecutar Vite; está en los ignores de ESLint y Prettier y no se edita a mano.
- El plugin `@tanstack/router-plugin` va **antes** del plugin de React en `vite.config.ts`; las
  rutas viven en `src/routes/` (los archivos de prueba no pueden ir ahí: serían rutas).
- Las pruebas definen `window.scrollTo` en `src/test/setup.ts` (jsdom no lo implementa) para
  silenciar el aviso de TanStack Router.
- shadcn/ui preset `radix-nova` (base radix) agrega `cn`, `radix-ui`, `shadcn` (por
  `shadcn/tailwind.css`), `@fontsource-variable/geist` y `tw-animate-css`; `components.json` en
  `apps/web`.
- TypeScript 6 **deprecó `baseUrl`** (error TS5101): el alias `@/*` se define solo con `paths`,
  que resuelve relativo al `tsconfig` de cada paquete.
- Husky 9 + lint-staged 17 (recibe rutas absolutas): el hook formatea con Prettier y lint-ea
  `apps/web` con ESLint, filtrando `routeTree.gen.ts`; commitlint 21 con
  `@commitlint/config-conventional`.
- CI (`.github/workflows/ci.yml`): checkout + `pnpm/action-setup` + `setup-node` (caché pnpm) +
  `pnpm install --frozen-lockfile` + `pnpm db:start` (Supabase local con la CLI fijada en el
  repositorio) + `pnpm check`. La versión de pnpm sale de `packageManager`.
- **Docker es requisito** para el Supabase local (`pnpm db:start`, `db:reset`, `db:test`). En Linux
  el usuario debe pertenecer al grupo `docker` y **relanzar la sesión** (los procesos ya en
  ejecución no heredan el grupo nuevo).
- Supabase local en Postgres 17; puertos API `54321`, base `54322`, Studio `54323`. `supabase
  init` generó `supabase/config.toml` y `supabase/.gitignore`.
- La CLI se usa como devDependency de la raíz (no global) para que la versión quede fijada por el
  lockfile; `db:types` pasa la salida por Prettier (`--stdin-filepath`) para que el archivo
  generado quede formateado igual en cada regeneración.
- La prueba pgTAP necesita la extensión: la migración `enable_pgtap` la instala en `extensions`, y
  el archivo de prueba fija `set search_path = extensions, public;`.
- `pnpm check` ahora incluye `db:test`, por lo que **requiere el Supabase local levantado**; el
  README lo advierte. Los tipos generados viven en `packages/shared/src/database.types.ts` y se
  exportan desde `packages/shared/src/index.ts`.

## Registro de sesiones

- 2026-10-07: proyecto base (monorepo pnpm, Vite + React + TypeScript, React Compiler, ESLint).
  `pnpm lint`, `pnpm typecheck` y `pnpm build` en verde; `pnpm dev` sirve "Axia". Rama
  `chore/proyecto-base`.
- 2026-10-07: herramientas de cumplimiento (TypeScript estricto, ESLint con los límites de la
  sección 14 y `jsx-a11y`, Prettier y `pnpm check`). Cada límite se verificó con archivos de
  prueba temporales (lint/typecheck fallan) que luego se borraron; `pnpm check` en verde.
- 2026-10-07: verificación de independencia del núcleo (`scripts/check-agnostic.mjs` +
  `pnpm check:agnostic`) integrada a `pnpm check`. Se probó el fallo con un nombre prohibido
  temporal en `apps/web/src/App.tsx` y se revirtió.
- 2026-10-07: pruebas de frontend (Vitest + Testing Library + `jest-dom`, entorno jsdom) con
  prueba real de la pantalla de inicio; `pnpm test` agregado a `pnpm check`.
- 2026-10-07: estructura por features y reglas de dependencia (dependency-cruiser,
  `pnpm check:boundaries`) integradas a `pnpm check`. Las seis reglas se probaron con violaciones
  temporales (fallan) y se revirtieron.
- 2026-10-07: Tailwind (plugin de Vite) y shadcn/ui con el preset `radix-nova`; alias `@` en
  TypeScript/Vite/Vitest; componentes `button`, `card`, `input` y `label`; pantalla de inicio con
  `Card`/`Button` y textos en `lib/i18n.ts`; prueba actualizada. `pnpm check` en verde.
- 2026-10-07: enrutado por carpetas (TanStack Router) y TanStack Query con `QueryClientProvider`
  en `app/`; rutas `__root`, `/` y no encontrado; pruebas de "/" y de ruta inexistente; las reglas
  de fronteras siguen en verde.
- 2026-10-07: automatización de la compuerta (Husky + lint-staged + commitlint) y CI que ejecuta
  `pnpm check`; se comprobó que un mensaje de commit inválido es rechazado.
- 2026-10-07: documentación de arranque: `README.md` y seis ADR iniciales en `docs/decisions/`;
  Fase 0 marcada y con lo pendiente explícito (Supabase local, PWA, Dexie, Playwright, pgTAP,
  `knip`, `supabase/`/`deploy/` y `chart`/Recharts).
- 2026-10-07: Supabase local (Fase 0, tarea 4): CLI como devDependency + scripts `db:*`,
  migración `enable_pgtap`, prueba pgTAP de humo, `db:reset` limpio, `db:types` → tipos en
  `packages/shared` y cliente tipado en `lib/supabase.ts`; `db:test` sumado a `pnpm check` y CI
  que levanta Supabase. `pnpm check` completo en verde. Rama `feat/supabase-local`.
