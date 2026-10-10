# Axia — Estado del proyecto

> El agente lee este archivo al iniciar cada sesión y lo actualiza al terminar cada tarea.
> Es la memoria del proyecto entre sesiones. Mantenlo corto y verídico.

**Última actualización:** 2026-10-09
**Fase actual:** Fase 8 — rediseño de interfaz (UI/UX), enfoque escritorio

## En curso

**Pausa por motivo/subestado y subestado obligatorio al reanudar (cerrado).** Al pausar se elige el
**motivo** (raíz); mientras está pausada se **gestiona** el **subestado** (cualquier descendiente del
motivo); **al reanudar es obligatorio** un **subestado** (hijo directo del motivo). Nueva columna
`ticket_pauses.root_reason_id`, función `ticket_pause_state`, nueva firma de `ticket_resume` y tramos
de tiempo **por subestado**. Panel con motivo, subestado actual e historial. **ADR 0061**.
`pnpm check` en verde.

_(Histórico)_ Subestados de pausa (ADR 0060), importación de catálogos (0059) y rediseños de
Administración (0057) y de Usuarios/Ámbitos/Calendarios (0058) cerrados; fase 8 completa. Regresión
visual **opt-in** (`pnpm test:visual`).

_(Histórico)_ Todas las fases 0–7 estaban cerradas; lo operativo lo hace la persona
(`deploy/README.md`, `docs/notificaciones-push.md`).

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
- **PWA + esqueleto Dexie (Fase 0, tareas 5-6)**: `vite-plugin-pwa` 2.0.0 con
  `workbox-build`/`workbox-window` 7.4.1 (MIT), `dexie` 4.4.6 + `dexie-react-hooks` 4.4.0
  (Apache-2.0) y `fake-indexeddb` 6.2.5 solo para pruebas. `VitePWA` con `registerType: 'prompt'`,
  manifest es-MX y workbox (`navigateFallback`, precache); el build genera `sw.js` y
  `manifest.webmanifest` (verificado sirviendo `dist`). Iconos **provisionales** en
  `apps/web/public/` (`pwa-192`, `pwa-512`, `pwa-512-maskable`, `apple-touch-icon`,
  `favicon.ico`; fondo `#0f172a`, "A" blanca, generados con ImageMagick) — reemplazar cuando la
  institución entregue el logo. Esqueleto offline en `src/lib/offline/`: `db.ts` (Dexie v1,
  `outbox` + `evidencias`, campos en inglés), `sync.ts` (dispara al abrir, `online` y
  `visibilitychange`) y pruebas Vitest (9 en verde). `PwaUpdatePrompt` (`useRegisterSW`) montado
  en `AppProviders`. `pnpm check` en verde. Rama `feat/pwa-offline`.
- **`knip` (Fase 0, tarea 7)**: `knip` 6.40.0 (ISC) como devDependency de la raíz, script
  `pnpm knip` sumado a `pnpm check`. `knip.json` (acepta comentarios) con la entrada
  `apps/web/src/lib/supabase.ts` y la excepción documentada del kit shadcn
  (`src/components/ui/**`). Hallazgos resueltos sin silenciar código muerto: se borró
  `apps/web/src/lib/utils.ts` (shim de `cn` sin importadores) y se quitaron `lucide-react` y
  `dexie-react-hooks` (se re-agregan cuando se usen); se mantienen `@axia/shared` y
  `@supabase/supabase-js` (los usa `lib/supabase.ts`). `pnpm knip` limpio. Rama `feat/knip`.
- **Cierre de Fase 0**: Playwright en `apps/web` (`@playwright/test` 1.64.0, Apache-2.0):
  `playwright.config.ts` (Chromium, `webServer` con `pnpm dev`) y humo `e2e/home.spec.ts` (la
  pantalla de inicio muestra "Axia" y "Comenzar"); `test` ahora corre Vitest + Playwright y el
  CI instala Chromium con `--with-deps`. Directorio `deploy/` creado con `README.md` de alcance
  (se puebla en la Fase 7). Con esto la Fase 0 queda cerrada con `pnpm check` en verde.
  Rama `chore/cierre-fase-0`.
- **Fase 1, Etapa A (documentación y diseño)**: se adoptó la especificación de negocio de la
  persona. `docs/especificacion-negocio.md` (secciones 1-14 íntegras + correcciones confirmadas:
  solicitante mixto, técnicos de catálogo, proxy, tiempos manuales); `docs/dominio.md` reescrito y
  consistente; `AGENTS.md` §11 actualizado; hoja de ruta de la Fase 1 con sus 8 tramos; y
  `docs/modelo-datos.md` con los 11 entregables de §15. **Sin migraciones**: la Etapa A termina en
  el punto de control, a la espera de aprobación. Rama `docs/fase-1-modelo-datos`.
- **Fase 1, Etapa A (ajustes)**: recaptura **sin aprobación** (se aplica y se avisa; la disconformidad
  va por reclamación), concurrencia y acciones tardías **"primero gana"**, **reactivación** al estado
  previo al descarte (`status_before_discard`), **calificación siempre opcional**, **duplicados sin
  seguidores** (solo enlace y aviso) y **concepto de seguidor eliminado**. Reflejado en
  `docs/especificacion-negocio.md`, `docs/dominio.md` y `docs/modelo-datos.md`; sin migraciones.
  Rama `docs/fase-1-ajustes`.
- **Fase 4B — tiempos manuales y proxy del técnico (cerrada el 2026-10-08)**, en ramas
  `feat/fase-4b-tiempos` y `feat/fase-4b-proxy` (fusionadas localmente a `main`; **sin push**):
  - Arreglo del E2E: las acciones de un clic se deshabilitan mientras su mutación está pendiente y
    la prueba offline afirma un solo `ticket_action` en la cola.
  - Tiempos manuales con atribución al técnico: `time_spans.subject_technician_id`, anulación
    (`voided_at`/`voided_by`) y re-registro, evento `manual_time_recorded`, RPC `time_span_void` y
    exclusión de anulados de los indicadores; sección de tiempos manuales en el detalle.
  - Proxy del técnico: sujeto opcional (`p_subject_technician_id`) en `ticket_start/attend/pause/
    advance_pause/resume/recapture`, validación `act_on_behalf` (admin cualquiera; supervisor sus
    técnicos) y participación; selector "a nombre de" para supervisor/admin.
  - Decisiones en el ADR 0020. Compuerta completa en verde: 277 pgTAP, 96 Vitest, 11 Playwright.
- **Fase 5A — tiempo laboral e indicadores (cerrada el 2026-10-08)**, rama `feat/fase-5a-metricas`
  (fusionada localmente a `main`; **sin push**):
  - Tiempo laboral por calendario: `teams.work_calendar_id` con respaldo al calendario de la
    instancia y funciones de recorte por franjas, días no laborables y zona horaria
    (`ticket_time_total/net/by_kind_laboral`).
  - Vistas de indicadores: base por tiquet (calendario y laboral, marcas y conteos), agregados por
    dimensión, duplicados por dimensión, carga por técnico, pausas y rechazos por motivo,
    antigüedad y ruteo; índices nuevos. Permiso `metrics.view`.
  - Decisiones en el ADR 0021. Compuerta completa en verde: 309 pgTAP, 96 Vitest, 11 Playwright.
  - Pendientes: satisfacción (sin tabla de calificación) y tiempos objetivo (SLA), como tramo aparte.
- **Fase 5A (ajuste) — cobertura por equipo, extra y festivos (2026-10-08)**, rama
  `feat/fase-5a-cobertura-extra` (fusionada localmente a `main`; **sin push**):
  - El tiempo laboral mide la **cobertura del equipo** (Mantenimiento 06:00–20:00; resto 08:00–17:00,
    de lunes a viernes), no el turno de cada persona; los turnos por persona y su rotación quedan
    fuera por decisión.
  - El trabajo real se separa en **en horario** (`_laboral`) y **fuera de horario** (`_extra`):
    noches, fin de semana y festivos trabajados no se pierden. Festivos oficiales de México
    (2026-2027) sembrados y editables. ADR 0022.
  - Pendiente: **UI de administración** de calendarios, turnos y festivos.
  - Compuerta completa en verde: 321 pgTAP, 96 Vitest, 11 Playwright.
- **Fase 5B-0 — administración de calendarios y zona horaria (2026-10-08)**, rama
  `feat/admin-calendarios` (fusionada localmente a `main`; **sin push**):
  - RLS de escritura con `catalog.manage` para calendarios (sin borrar: se desactivan), franjas y
    festivos; pgTAP de las políticas.
  - Pantalla `/admin/calendarios` (calendarios, franjas semanales y festivos), calendario por
    equipo en el catálogo de equipos y calendario por defecto en configuración.
  - `me()` devuelve la zona horaria y la interfaz muestra las fechas en la zona de la institución.
  - Decisiones en el ADR 0023.
  - Compuerta completa en verde: 336 pgTAP, 103 Vitest, 11 Playwright.
- **Fase 5B — tablero de métricas (cerrada el 2026-10-08)**, rama `feat/fase-5b-tableros`
  (fusionada localmente a `main`; **sin push**):
  - Sección `/metricas` con el permiso `metrics.view`, Recharts (MIT) y un componente `chart` propio
    con la API de shadcn/ui; KPI, volumen por día, promedio por dimensión, pausas por motivo, aging
    y exportación CSV, con filtros de fecha y dimensión.
  - Agregación en el frontend con funciones puras probadas. Decisiones en el ADR 0024.
  - Compuerta completa en verde: 336 pgTAP, 112 Vitest, 12 Playwright.
  - Pendientes del tablero: indicadores de duplicados, satisfacción (sin tabla) y SLA (tramo aparte).
- **Fase 5, sub-fase 5C — fundación de interfaz con shadcn/ui (ola 1, 2026-10-08)**, rama `feat/fase-5c-ui`
  (fusionada localmente a `main`; **sin push**):
  - Instala las primitivas de shadcn/ui (dialog, sheet, table, tabs, badge, checkbox, switch,
    radio-group, alert, separator, skeleton, tooltip, dropdown-menu, pagination, progress, sonner y
    el `chart` completo), `lucide-react` y `sonner`; `Toaster`/`TooltipProvider` globales.
  - `components/ui/**` se trata como *vendored* (límites de ESLint relajados y documentados).
  - Ola 1: insignia → `Badge`, métricas → `Table`, acciones del tiquet → `Sheet`, catálogos →
    `Dialog`, toasts al guardar. Decisiones en el ADR 0025.
  - Compuerta completa en verde: 336 pgTAP, 112 Vitest, 12 Playwright.
  - **Ola 2 (2026-10-08, rama `feat/fase-5c-ui-2b`):** campos compartidos sobre las primitivas
    `field` de shadcn; roles con `Tabs`/`Table`; usuarios con `Switch`/`Checkbox`; estados de
    carga/error con `Skeleton`/`Alert`; formularios de auth y tiquets con `Alert`; `textarea`.
    Queda `evidence-uploader` → `Progress` y más `Tooltip`/`Skeleton` oportunistas.
- **Indicadores de duplicados y satisfacción (2026-10-08)**, ramas `feat/pendientes-duplicados` y
  `feat/pendientes-satisfaccion` (fusionadas localmente a `main`; **sin push**):
  - Duplicados: vistas de tiempo hasta marcarse y alertas por decisión, y sección en `/metricas` con
    tasa por dimensión.
  - Satisfacción: `ticket_ratings`, RPC `ticket_rate` (propia o por proxy), evento `rated`, vista
    `v_metrics_satisfaction`, formulario de estrellas en el tiquet cerrado y KPI en el tablero.
  - Zona horaria confirmada: `America/Mexico_City`. Decisiones en el ADR 0026.
  - Compuerta completa en verde: 348 pgTAP, 116 Vitest, 12 Playwright.
- **Tiempos objetivo (SLA) — cierre de la Fase 5 (2026-10-08)**, rama `feat/fase-5-sla` (fusionada
  localmente a `main`; **sin push**):
  - `service_types.target_minutes` (el tipo de servicio sobrescribe a la prioridad), modo de reloj
    de instancia (`sla_clock_mode`), vistas `v_ticket_sla` / `v_metrics_sla` /
    `v_metrics_sla_by_priority` (medición de resolución) y KPI + sección por prioridad en `/metricas`.
  - Configurable desde administración; `NULL` = sin objetivo. ADR 0027.
  - Selector de unidad (**minutos, horas o días**) en el formulario de administración; la tabla
    muestra el objetivo de forma legible (p. ej. `4 h`).
  - Compuerta completa en verde: 358 pgTAP, 116 Vitest, 12 Playwright.
- **Remate de la Fase 5 (2026-10-08)**, rama `feat/fase-5-xlsx-progress` (fusionada localmente a
  `main`; **sin push**):
  - Exportación **XLSX** con `exceljs` (MIT, carga diferida) junto al CSV.
  - **Progreso** real de la subida de evidencia (TUS `onProgress` + barra `Progress`).
  - `Skeleton`/`Alert` en las cargas restantes y `Tooltip` en los KPI. ADR 0028.
  - Compuerta completa en verde: 358 pgTAP, 120 Vitest, 12 Playwright.
- **Fase 6A — infraestructura genérica de importación (2026-10-08)**, rama `feat/fase-6a-import`
  (fusionada localmente a `main`; **sin push**):
  - Tablas `import_batches`, `import_records`, `catalog_aliases` e `import_status_map`; permiso
    `data.import`; RPCs (lote, fila, alias, estatus y **upsert idempotente** de tiquet que conserva
    el número original y continúa la secuencia); evento `imported` (`source='import'`).
  - Administración `/admin/integraciones` (mapeo de estatus y lotes). ADR 0029.
  - Compuerta completa en verde: 372 pgTAP, 120 Vitest, 12 Playwright.
- **Fase 6B — adaptador CSV/Excel (2026-10-08)**, rama `feat/fase-6b-adaptador` (fusionada
  localmente a `main`; **sin push**):
  - Feature `integrations` aislada: lectura (papaparse/exceljs), normalización pura (cabeceras,
    fechas en la zona configurada, marcadores → `NULL`), dry run con reporte de calidad, resolución
    de alias/estatus e importación idempotente; asignación del técnico con `import_ticket_assign`.
  - Se permite a `routes/` importar integrations (frontera ajustada). ADR 0030.
  - Compuerta completa en verde: 377 pgTAP, 125 Vitest, 12 Playwright.
- **Fase 6C-1 — verificación de métricas (2026-10-08)**, rama `feat/fase-6c-verificacion` (fusionada
  localmente a `main`; **sin push**):
  - Prueba pgTAP con un conjunto ficticio equivalente (marcas fijas) y valores calculados a mano de
    cada tramo, total y neto; pausa no contable, exclusión de duplicados, conteos y tiempo total de
    un importado. ADR 0031.
  - Compuerta completa en verde: 391 pgTAP, 125 Vitest, 12 Playwright.
- **Fase 7A/7B — despliegue autoalojado y respaldos (2026-10-08)**, rama `feat/fase-7-despliegue`
  (fusionada localmente a `main`; **sin push**):
  - `deploy/` con ejemplos de entorno, `supabase/` (compose oficial) y runbook;
    scripts `migrate.sh`, `publish-web.sh`, `backup.sh` y `restore.sh` (con `DATABASE_URL` o
    `DB_CONTAINER`, retención y drill). Sin secretos en el repo. ADR 0032.
  - Verificado en local: `backup.sh` genera el dump y `restore.sh` lo restaura en una base
    desechable (conteos comprobados). Compuerta sin cambios (391 pgTAP, 125 Vitest, 12 Playwright).
- **Fase 6C-2 — historia al importar (2026-10-08)**, rama `feat/fase-6c2-historia` (fusionada
  localmente a `main`; **sin push**):
  - `import_ticket_timeline` reconstruye los tramos del importado (atención = reporte→asignación,
    trabajo = asignación→finalización, total = reporte→finalización), idempotente y solo con las
    marcas de la fuente; el adaptador la invoca tras el upsert. ADR 0033.
  - Compuerta completa en verde: 397 pgTAP, 125 Vitest, 12 Playwright.
- **Fase 6D — convivencia (2026-10-08)**, rama `feat/fase-6d-convivencia` (fusionada localmente a
  `main`; **sin push**):
  - `integration_tasks` (tareas con responsable y fecha), `ticket_external_refs.external_status` y
    `external_systems.authority`; RPCs `integration_task_create/resolve` y `external_status_set`; UI
    de tareas en `/admin/integraciones`. ADR 0034.
  - Compuerta completa en verde: 404 pgTAP, 125 Vitest, 12 Playwright.
- **Fase 7C — PWA (2026-10-08)**, rama `feat/fase-7c-pwa` (fusionada localmente a `main`; **sin push**):
  - Manifest completo (`id`, `orientation`, `categories`, `purpose` de los iconos) **conservando los
    iconos genéricos**; caché del service worker revisada (app shell, sin cachear API). Sin arte nuevo.
- **Fase 7D — push, CI/CD y Capacitor (2026-10-08)**, rama `feat/fase-7d-produccion` (fusionada
  localmente a `main`; **sin push**):
  - `push_subscriptions` (RLS por usuario) y guía de activación en `docs/notificaciones-push.md`;
    workflow **manual** `deploy.yml` guardado por secretos; Capacitor documentado. ADR 0035.
  - Compuerta completa en verde: 404 pgTAP, 125 Vitest, 12 Playwright.
- **Despliegue sin proxy impuesto (2026-10-08)**, rama `feat/deploy-sin-proxy` (fusionada localmente
  a `main`; **sin push**):
  - Se elimina `deploy/Caddyfile`: el **reverse proxy es elección de quien despliega**. `deploy/`
    documenta el **contrato** y ofrece **ejemplos** (nginx y Traefik) en `deploy/examples/`.
  - Nuevo comando único `deploy/scripts/up.sh` (con `--dry-run`) que trae el compose oficial de
    Supabase y migra si hay `DATABASE_URL`; `down.sh` lo apaga sin borrar datos. ADR 0036.
- **Axia con Docker Compose (2026-10-08)**, rama `feat/deploy-compose` (fusionada localmente a
  `main`; **sin push**):
  - `deploy/docker-compose.yml` (`web` + `migrate`) que apunta a un Supabase **aparte** (Cloud o
    autoalojado). El frontend lee su configuración en **runtime** (`config.js`), así que una misma
    imagen sirve para cualquier instalación; `web.Dockerfile`/`migrate.Dockerfile` y publicación en
    GHCR (`publish-images.yml`). ADR 0037.
  - Verificado en local: la imagen `web` genera `config.js` desde el entorno, sirve el SPA y responde
    `no-store`/`no-cache`; la imagen `migrate` responde "Remote database is up to date" contra la base
    local.

## Siguiente

No hay fases pendientes. Lo que queda es **operativo** y lo hace la persona: desplegar
(`deploy/README.md`), aplicar migraciones, activar correo/push/escalamiento
(`docs/notificaciones-push.md`) y, si se quiere, Capacitor. Mejoras futuras posibles: iconos con el
logo definitivo, bandeja de notificaciones in-app y afinado de parámetros por la operación real.

## Hoja de ruta

El núcleo se construye y se puede usar **sin ninguna integración**. Las integraciones y la
migración van después, sobre un núcleo ya estable.

### Fase 0 — Arranque (sin dependencias de negocio) — **cerrada el 2026-10-07**
- [x] Monorepo pnpm: `apps/web`, `packages/shared`, `supabase/`, `deploy/`, `docs/`, `scripts/`
- [x] App Vite + React + TypeScript con Tailwind, shadcn/ui, TanStack Router (rutas por carpetas)
      y TanStack Query (el componente `chart`/Recharts llega con las métricas, Fase 5)
- [x] Supabase local funcionando, cliente tipado, `pnpm db:types`
- [x] PWA configurada (manifest, iconos provisionales, `registerType: 'prompt'`) y esqueleto Dexie (`outbox`, `evidencias`)
- [ ] Herramientas que hacen cumplir las convenciones: TypeScript estricto, ESLint con los
      límites de tamaño, `dependency-cruiser` o `eslint-plugin-boundaries`, Prettier, knip,
      Husky + lint-staged, commitlint
- [x] **`pnpm check:agnostic`**: script con lista configurable de nombres de terceros
      (incluye los nombres de este proyecto de origen) y rutas permitidas
- [x] Vitest, Playwright y prueba pgTAP de humo
- [x] Scripts de raíz, incluido **`pnpm check`** (lint + typecheck + check:agnostic +
      check:boundaries + knip + test + db:test + build)
- [x] CI que ejecuta la compuerta completa (levanta Supabase antes)
- [x] `README.md` (levantar el proyecto en 10 minutos), `.env.example`, `.gitignore`
- [x] ADR iniciales en `docs/decisions/`: Vite + React como SPA, Supabase, Recharts en lugar
      de ECharts, cola offline con Dexie, modelo de bloqueos dirigido por datos, independencia
      del núcleo
- [x] Pantalla de inicio "Axia" visible y `pnpm check` en verde

**Fase 0 cerrada el 2026-10-07** con `pnpm check` en verde. El componente `chart`/Recharts
llega con las métricas (Fase 5) y `deploy/` se puebla en producción (Fase 7).

### Fase 1 — Base de datos núcleo (modelo de datos)
Modelo completo según `docs/especificacion-negocio.md`. **Punto de control:** se aprueba
`docs/modelo-datos.md` antes de escribir ninguna migración. Cada tramo con pgTAP y `pnpm check`:
1. [x] Configuración de la instancia, catálogos maestros y motivos jerárquicos
2. [x] Usuarios, perfiles, roles, permisos y ámbitos (equipo, edificios, categorías)
3. [x] Tiquets, folio, historial, participantes y evidencias
4. [x] Ruteo, ofertas, detección de posibles duplicados y transiciones del flujo (RPC)
5. [x] Pausas, recaptura, reclamaciones, reapertura, duplicados y reactivación
6. [x] Tiempos: calendarios, tramos y funciones de cálculo
7. [x] Notificaciones, reglas y escalamiento
8. [x] RLS completa, visibilidad, semillas y vistas de indicadores

**Fase 1 cerrada el 2026-10-07**: `pnpm db:reset` reconstruye todo desde cero con semillas, 175
pruebas pgTAP en verde y `pnpm check` completo en verde. Decisiones en los ADR 0007-0014.

### Fase 2 — Autenticación y estructura de la app — **cerrada el 2026-10-08**
- [x] Inicio de sesión (correo y contraseña, sin auto-registro), perfil automático al dar de alta
      la cuenta, `me()` con perfil/roles/permisos, "Mi perfil" y layout con rutas protegidas por
      permiso (la seguridad real es RLS). ADR 0016.

### Fase 3 — Pantallas principales
**Fase 3A — Operación (cerrada el 2026-10-08):**
- [x] Alta de tiquets con catálogos, lista y detalle con línea de tiempo
- [x] Vista del técnico (móvil primero) y bandejas del supervisor
- [x] Evidencia en línea mínima (bucket privado, `evidence_add`, subida y URL firmada) — ADR 0017
- [x] (Cerrado el 2026-10-08) Interfaz de recaptura, reclamaciones (abrir/resolver), marcar
      duplicado, reactivación, reasignar supervisor (a equipo o supervisor) y agregar auxiliares
      (los RPC ya existían; sin migraciones). Queda pendiente la calificación de satisfacción.

**Fase 3B — Administración — cerrada el 2026-10-08:**
- [x] Catálogos maestros y motivos jerárquicos (feature `admin`, `/admin/catalogos`)
- [x] Roles y permisos (matriz permiso × rol con ámbito), usuarios y ámbitos/designaciones
- [x] Configuración esencial de la instancia (`/admin/configuracion`)
- [ ] (Fuera de 3B) Alta/invitación de cuentas (Edge Function), calendarios laborales, reglas de
      notificación/escalamiento y parámetros finos de duplicados

### Fase 4 — Evidencias y modo sin conexión — **cerrada el 2026-10-08**
- [x] Captura y compresión de fotos, subida reanudable, cola `outbox` y sincronización (evidencia) —
      ADR 0019
- [x] Acciones del tiquet por la cola cuando no hay conexión (con `client_request_id` para idempotencia)
- [x] Registro de tiempos manuales (interfaz) y actos en nombre de otro (proxy) — ADR 0020
- [x] Prueba Playwright del flujo de evidencia del técnico sin conexión

### Fase 5 — Métricas y reportes — **cerrada el 2026-10-08**
- [x] **5A** Indicadores de la especificación §11 calculados en la base (calendario y laboral,
      sin duplicados) con vistas y pgTAP — ADR 0021
- [x] **5B-0** Administración de calendarios (franjas y festivos) y fechas en la zona de la
      institución — ADR 0023
- [x] **5B** Tablero con Recharts (KPI, dimensiones, pausas, aging), filtros y exportación CSV —
      ADR 0024
- [x] **5C** Fundación de interfaz con shadcn/ui (sheet/dialog, table, tabs, badge, `field`,
      toasts, skeleton/alert) — ADR 0025
- [x] Indicadores de **duplicados** en el tablero (tiempo hasta marcarse y alertas) y **satisfacción**
      (tabla `ticket_ratings`, RPC `ticket_rate`, KPI y formulario) — ADR 0026
- [x] **Tiempos objetivo (SLA)** por prioridad y tipo de servicio, configurables, con modo de reloj y
      cumplimiento en el tablero — ADR 0027
- [x] (Menor) exportación **XLSX** (exceljs, carga diferida), **progreso** de subida de evidencia y
      `Skeleton`/`Alert`/`Tooltip` de remate — ADR 0028

### Fase 6 — Integraciones y migración (opcional, aislada del núcleo)
- [x] **6A** Infraestructura genérica de importación: `import_batches`, `import_records`,
      `catalog_aliases`, `import_status_map`, RPCs y permiso `data.import`; administración
      (`/admin/integraciones`) — ADR 0029
- [x] **6B** Adaptador CSV/Excel de la fuente heredada: dry run con reporte de calidad, resolución
      de alias y estatus, e importación idempotente con asignación del técnico — ADR 0030
- [ ] **6C** Verificación: las métricas base coinciden con las cifras actuales de la fuente
- [x] **6C-1** Verificación de las **fórmulas** de métricas con datos ficticios equivalentes (respuesta,
      asignación, espera, trabajo activo, pausa, validación, total y neto; duplicados excluidos;
      puente de importación por el tiempo total) — ADR 0031
- [x] **6C-2** Reconstruir la línea de tiempo al importar para que los tres intervalos de los
      importados coincidan con la fuente (`import_ticket_timeline`) — ADR 0033
- [x] **6D** Convivencia: `integration_tasks`, `external_status` y `authority` del origen, con RPCs y
      UI (tareas abiertas) — ADR 0034

### Fase 7 — Producción
- [x] **7A** Despliegue autoalojado: `deploy/` con ejemplos de entorno, `supabase/` (compose
      oficial), scripts de migración y publicación, y runbook — ADR 0032
- [x] **7B** Respaldos y restauración: `backup.sh`/`restore.sh` con retención y prueba de
      restauración documentada (verificada en local)
- [x] **7C** PWA final: manifest completo (`id`, orientación, categorías, propósito de los iconos) con
      los iconos genéricos actuales y caché del service worker revisada
- [x] **7D** Push (`push_subscriptions` + guía de activación), **CI/CD manual** (`.github/workflows/
      deploy.yml`, guardado por secretos) y Capacitor documentado — ADR 0035

## Bloqueos y preguntas para la persona

Ninguna bloquea la Fase 0. Cuando una tarea dependa de una, regístrala aquí con tu pregunta
concreta, opciones y recomendación.

| # | Pregunta | Bloquea | Estado |
|---|---|---|---|
| 1 | Lista inicial de motivos, subestados y campos | Fase 1 (semilla) | **Resuelta**: §6 de la especificación trae las semillas ficticias |
| 2 | ¿Los solicitantes tendrán cuenta o serán contactos sin cuenta? | Fase 1 | **Resuelta**: modelo mixto (catálogo con vínculo opcional) |
| 3 | Zona horaria de la institución y horario laboral para métricas | Fase 5 | **Resuelta (diseño)**: una zona para la instancia (`America/Mexico_City`; confirmar si difiere), cobertura por equipo (Mantenimiento 06:00–20:00; resto 08:00–17:00 L–V), extra separado y festivos oficiales MX editables (ADR 0022) |
| 4 | Formato del número de tiquet | Fase 1 | **Resuelta**: RN-25 (UUID interno + consecutivo global + folio por patrón) |
| 5 | ¿Se requieren tiempos objetivo (SLA) por prioridad o tipo de servicio? | Fase 5 | **Resuelta**: configurables por prioridad y tipo de servicio (el tipo sobrescribe), medidos sobre la resolución en el reloj de la instancia; `NULL` = sin SLA (ADR 0027) |
| 6 | Valores distintos de la columna ESTATUS de la hoja (solo se conoce `EN PROCESO`) | Fase 6 | **Resuelta (parcial)**: se mapean desde `/admin/integraciones` (`import_status_map`); se afina con los valores reales |
| 7 | ¿La plataforma de origen exporta (CSV/Excel), tiene API o envía correos? | Fase 6 | **Resuelta**: archivo **CSV/Excel** (adaptador en la Fase 6B) |
| 8 | ¿"Asignación de trabajo" es asignación al técnico o inicio del trabajo? | Fase 6 | **Resuelta**: asignación al técnico |
| 9 | ¿Más de una pestaña o año en la hoja? ¿Volumen aproximado? | Fase 6 | Pendiente (el adaptador lee la primera hoja) |
| 10 | ¿La recaptura del técnico exige aceptación de supervisor **y** solicitante? | Fase 1 | **Resuelta**: sin aprobación; se aplica, se avisa y la disconformidad va por reclamación |
| 11 | Reglas de acciones tardías sin conexión y de concurrencia | Fase 1 (tramo 4) | **Resuelta**: "primero gana" |
| 12 | ¿Basta una sola fila de configuración de instancia por base? | Fase 1 (tramo 1) | **Resuelta**: una instancia por base |
| 13 | Definición del contenido de la alerta de duplicados | Fase 1 (tramo 4) | **Resuelta**: folio, estado, fecha, ubicación, problema y contacto |

Las preguntas de la Fase 1 quedaron resueltas; las decisiones están en el bloque de correcciones de
`docs/especificacion-negocio.md` y en `docs/modelo-datos.md`.

## Decisiones registradas

Confirmadas (se registran como ADR al implementar la Fase 1; ver `docs/modelo-datos.md`):

- **Solicitante mixto**: catálogo de solicitantes con vínculo opcional a una cuenta; se distingue
  `registered_by` (actor) del solicitante.
- **Técnicos de catálogo**: un técnico puede existir sin cuenta; la asignación apunta al catálogo.
- **Proxy**: el administrador actúa en nombre de cualquiera; el supervisor, sobre sus técnicos. El
  historial distingue actor y sujeto.
- **Tiempos manuales**: supervisor/admin los registra y corrige, con origen, autor y validaciones.
- **Roles y permisos configurables**: los permisos son un conjunto fijo; los roles se arman con
  permisos y ámbito.
- **Calidad de captura**: la recaptura conserva original y versiones (mide la calidad de captura).
- **Folio**: UUID interno + consecutivo global + folio legible por patrón (RN-25).

Sustituidas por la especificación (pendientes de ADR que las reemplace): el modelo de bloqueos
`blocker_types`/`blocker_states`/`blocker_transitions`/`blocker_fields` (ADR 0005), el rol
`dispatcher`, el `on_hold` calculado con varios bloqueos simultáneos y el tiquet sustituto.

## Notas de entorno

- Versiones (oct 2026): Node 24.18.0, pnpm 12.8.1, Vite 8.3.3, `@vitejs/plugin-react` 6.1.2,
  React 19.3.0, TypeScript `~6.0.2`, ESLint 9.39.5, `eslint-plugin-react-hooks` 7.1.1,
  `eslint-plugin-jsx-a11y` 6.10.2, `babel-plugin-react-compiler` 1.0.0, `@rolldown/plugin-babel`
  0.2.4, `@babel/core` 8.0.6, Prettier 3.9.9, Vitest 5.0.3, `@testing-library/react` 16.3.3,
  `@testing-library/jest-dom` 7.0.1, jsdom 29.1.1, `supabase` (CLI) 2.120.0,
  `@supabase/supabase-js` 2.117.2, `vite-plugin-pwa` 2.0.0, `workbox-build`/`workbox-window`
  7.4.1, `dexie` 4.4.6, `dexie-react-hooks` 4.4.0, `fake-indexeddb` 6.2.5 (solo pruebas),
  `knip` 6.40.0, `@playwright/test` 1.64.0.
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
- **Iconos provisionales**: fondo `#0f172a`, "A" blanca en `Adwaita-Sans-Bold`, generados con
  ImageMagick (`magick -size 512x512 xc:'#0f172a' ... -annotate 0 'A'`); el maskable lleva la "A"
  más pequeña (zona segura). Reemplazar cuando la institución entregue el logo.
- **fake-indexeddb no conserva Blob**: al leer, el `Blob` vuelve como objeto vacío (verificado
  con una prueba sonda temporal, luego borrada). La prueba de evidencias solo verifica metadatos;
  en un navegador real IndexedDB sí guarda el Blob.
- En dev, `/manifest.webmanifest` cae al fallback de la SPA (el manifest solo se genera en el
  build); los iconos y el HTML con `theme-color` sí se sirven. El aviso de actualización no
  aparece en dev/test porque `useRegisterSW` es un no-op fuera del build.
- **Playwright**: `playwright.config.ts` (Chromium, `webServer` con `pnpm dev`) y humo en
  `apps/web/e2e/`; `test` corre Vitest y luego Playwright. Vitest excluye `e2e/**` en
  `vite.config.ts` (cada corredor corre lo suyo). Los navegadores se instalan aparte
  (`playwright install chromium`, con `--with-deps` en el CI) y viven en `~/.cache`, fuera del
  repositorio.
- **knip**: el `knip.json` acepta comentarios (verificado con `prettier --check`, que también
  lo acepta). Las entradas de `apps/web` (`main.tsx`, `vite.config.ts`, `test/setup.ts`) las
  detecta knip solo con sus plugins — solo hizo falta declarar `src/lib/supabase.ts`. Los
  imports desde archivos bajo `ignore` siguen contando para el uso de dependencias (verificado:
  `cn`, `class-variance-authority` y `radix-ui` no se marcan aunque el kit esté ignorado).
- **Fase 2 — usuarios demo**: se siembran en `supabase/seed.sql` insertando en `auth.users` +
  `auth.identities` (contraseña `AxiaDemo2026!`, solo local) porque `supabase db reset` es
  reproducible y no depende de la Admin API. GoTrue exige que `confirmation_token`,
  `recovery_token`, `email_change_token_new` y `email_change` **no sean nulos** al iniciar sesión
  (con nulos falla con "converting NULL to string is unsupported"); la semilla los pone en `''`.
- **Fase 2 — privilegios por defecto de Supabase**: las funciones nuevas en `public` se conceden a
  `anon`, `authenticated` y `service_role` (no solo a `PUBLIC`), así que `revoke ... from public`
  no bastaba. La migración de la Fase 2 retira `EXECUTE` a `anon` de todas las funciones del
  esquema y ajusta los privilegios por defecto; el cliente anónimo no ejecuta ninguna RPC.
- **Fase 2 — entorno del cliente**: `apps/web/.env.local` se genera con `pnpm env:local`
  (`scripts/write-local-env.mjs`, lee `supabase status -o json`); el CI lo ejecuta tras
  `pnpm db:start`. Vitest define `test.env` con valores ficticios para que `createClient` no falle
  al importar (las pruebas sustituyen los hooks; no hay red).
- **Fase 2 — dependencias de formularios**: `react-hook-form` 7.89, `zod` 4.6.5 y
  `@hookform/resolvers` 5.9.1 (MIT). Zod 4 usa `z.email()` (no `z.string().email()`).
- **Fase 2 — rutas sin ruta**: el layout protegido es `routes/_authenticated.tsx` y sus hijas viven
  en `routes/_authenticated/` (`index.tsx` = `/`). El guard es un componente (`RequireAuth`) que
  usa el contexto de sesión; no se pasó la sesión por el contexto del router para no acoplar el
  árbol de rutas a la suscripción de Supabase.
- **Fase 2 — fronteras**: como `@supabase/supabase-js` solo puede importarse desde `features/*/api`
  y `lib/`, el tipo `Session` se reexporta como `AuthSession` desde `features/auth/api`; los hooks
  importan de ahí.
- **Fase 3A — evidencia y Storage**: bucket privado `evidence` (imágenes/PDF, 20 MiB) con ruta
  `tickets/<id>/<ciclo>/<uuid>.<ext>` y políticas de `storage.objects` ligadas a `can_see_ticket`.
  La subida es en línea (Fase 4 añade cámara, compresión, reanudable y offline). `can_see_ticket`
  ahora incluye a los participantes auxiliares.
- **Fase 3A — acciones**: la UI muestra acciones contextuales por estado y permiso
  (`domain/actions.ts`); las mutaciones por RPC invalidan la caché `['tickets']`. Interfaz diferida
  (documentada arriba): reasignar supervisor, auxiliares, recaptura, duplicado, reclamaciones,
  reactivación y calificación.
- **Fase 3A — pruebas pgTAP y datos de la app**: los tiquets que deja la app o Playwright rompían
  las pruebas que asumían la tabla vacía (`order by ticket_number limit 1`); cada prueba de tiquets
  hace `truncate public.tickets cascade` dentro de su transacción.
- **Fase 3B — escritura por RLS**: las tablas de configuración admiten escritura directa mediante
  políticas gobernadas por `has_permission((select auth.uid()), …)`; los catálogos se desactivan
  (`active=false`), nunca se borran, y solo las tablas de relación admiten `DELETE` (ADR 0018).
- **Fase 3B — gestor de catálogos genérico**: `CatalogManager` se maneja por configuración
  (`domain/catalogs.ts`); el acceso usa una lista blanca de tablas (`AdminTable`) y `@ts-expect-error`
  documentado para las escrituras dinámicas, porque el cliente tipado no puede estrechar una tabla
  dinámica. Los datos se validan con las funciones puras de `domain/form-values.ts`.
- **Fase 4A — offline**: `tus-js-client` 4.3.1 (MIT) para la subida reanudable y `dexie-react-hooks`
  4.4.0 (Apache-2.0) para observar la cola. La mutación de evidencia usa
  `networkMode: 'always'` porque React Query pausa las mutaciones sin conexión. Dexie va en versión 2
  (se añadieron campos a `outbox`/`evidences`). El endpoint de TUS se arma con `VITE_SUPABASE_URL`.
- **Fase 4A — acciones offline**: las mutaciones de transición usan `networkMode: 'always'` y, si
  fallan por red (`isNetworkError`), se encolan como `ticket_action` con el mismo `client_request_id`.
  La cola se ordena por `seq` (campo sin índice, ordenado en memoria) y se serializa con un mutex para
  que encolar y procesar no se pisen; **sin conexión no se procesa** (se reintenta al evento `online`).
  Los errores de dominio no se reintentan (se marcan `error` con su motivo).

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
- 2026-10-07: PWA + esqueleto Dexie (Fase 0, tareas 5-6): `VitePWA` (`registerType: 'prompt'`,
  manifest es-MX, workbox con precache), iconos provisionales en `public/`, `sw.js` y
  `manifest.webmanifest` verificados en `dist`; `src/lib/offline/` (Dexie v1, disparadores y
  pruebas) y `PwaUpdatePrompt` en `AppProviders`. `pnpm check` en verde. Rama `feat/pwa-offline`.
- 2026-10-07: `knip` (Fase 0, tarea 7): `knip.json` con la entrada de `lib/supabase.ts` y la
  excepción documentada del kit shadcn; se borró `lib/utils.ts` y se quitaron `lucide-react` y
  `dexie-react-hooks`. `pnpm knip` limpio y `pnpm check` en verde. Rama `feat/knip`.
- 2026-10-07: cierre de Fase 0: Playwright (`@playwright/test`, humo de la pantalla de inicio
  en `e2e/home.spec.ts`, Chromium instalado en el CI) y `deploy/` con `README.md` de alcance.
  `pnpm check` en verde; la siguiente es la Fase 1. Rama `chore/cierre-fase-0`.
- 2026-10-07: Fase 1, Etapa A (documentación y diseño): `docs/especificacion-negocio.md`
  (secciones 1-14 + correcciones confirmadas), `docs/dominio.md` reescrito, `AGENTS.md` §11,
  hoja de ruta de la Fase 1 y `docs/modelo-datos.md` (11 entregables). Se **detiene** a la espera
  de aprobación; sin migraciones. Rama `docs/fase-1-modelo-datos`.
- 2026-10-07: Fase 1, Etapa A (ajustes): recaptura sin aprobación, concurrencia "primero gana",
  reactivación al estado previo, calificación opcional, duplicados sin seguidores y seguidor
  eliminado; documentos actualizados. `pnpm check` en verde. Rama `docs/fase-1-ajustes`.
- 2026-10-07: Fase 1, Etapa B (tramos 1-4): migraciones `instance_settings_and_catalogs`,
  `users_roles_and_scopes`, `tickets_and_history` y `routing_offers_and_transitions`, con sus
  pruebas pgTAP (catalogos, usuarios/roles, tiquets/folio/evidencias y flujo con RPC ruteo,
  asignación, inicio, atendido, validación). `pnpm db:reset` limpio y `pnpm check` en verde.
  Rama `feat/fase-1-db`.
- 2026-10-07: Fase 1, Etapa B, tramo 5: pausas y subestados, recaptura, reclamaciones
  (procedente/improcedente/requiere tiquet nuevo), duplicados y reactivación, con sus RPC y
  pruebas pgTAP. `pnpm check` en verde. Rama `feat/fase-1-tramos-5-8`.
- 2026-10-07: Fase 1, Etapa B, tramos 6-7: `time_spans` con disparador que deriva los tramos de la
  bitácora y funciones `ticket_time_total`/`ticket_time_net`/`ticket_time_by_kind` y registro
  manual; `notification_rules`, `notifications` y `escalation_rules` con encolado por evento y
  lectura. 165 pruebas pgTAP en verde. Rama `feat/fase-1-tramo6`.
- 2026-10-07: Fase 1, Etapa B, tramo 8 y cierre: RPC a `security definer` con `search_path` fijo
  (opción a), políticas RLS de lectura, vista de visibilidad al solicitante, vista base de
  indicadores, integración genérica (`external_systems`, `ticket_external_refs`) y semillas de
  catálogos/motivos/calendario. **175 pruebas pgTAP** y `pnpm check` en verde; **Fase 1 cerrada**.
  Rama `feat/fase-1-tramo8`.
- 2026-10-08: Fase 2, tramo 1: migración `auth_profiles_and_identity` (disparador de perfil, `me()`,
  `profile_update()` y endurecimiento de permisos de ejecución), semilla de usuarios demo y
  `enable_signup = false`; `90_auth_profiles.test.sql` (25 pruebas) y 200 pgTAP en verde;
  `pnpm db:reset` limpio y `pnpm db:types`. ADR 0016. Rama `feat/fase-2-auth`.
- 2026-10-08: Fase 2, tramo 2: feature `auth` (sesión con `AuthProvider`, guard por permiso,
  `AppShell`, acceso, panel, perfil y administración reservada), script `pnpm env:local`, pruebas
  Vitest (32) y Playwright (4) en verde. `pnpm check` completo en verde. Rama `feat/fase-2-auth`.
- 2026-10-08: Fase 3A, tramo 1: bucket `evidence` + RPC `evidence_add`, `ticket_assign_supervisor`,
  `ticket_add_auxiliary` y `ticket_check_duplicates`; `can_see_ticket` incluye auxiliares; 234 pruebas
  pgTAP en verde. ADR 0017. Rama `feat/fase-3a-operacion`.
- 2026-10-08: Fase 3A, tramo 2: features `catalogs` y `tickets`; alta con aviso de duplicados, lista
  con filtros en la URL, detalle con línea de tiempo (`v_ticket_timeline`); campos de formulario
  compartidos; Playwright del alta. Las pruebas pgTAP de tiquets se aíslan con `truncate`.
- 2026-10-08: Fase 3A, tramo 3: acciones por estado/permiso, mutaciones de transición, evidencia en
  línea, `/inbox` (supervisor) y `/mi-trabajo` (técnico); Playwright del flujo del técnico. 239
  pgTAP, 63 Vitest y 6 Playwright en verde; `pnpm check` completo en verde. **Fase 3A cerrada**.
- 2026-10-08: Fase 3B, tramo 1: políticas RLS de escritura por `has_permission` para catálogos,
  motivos, roles/permisos, usuarios, ámbitos y designaciones; DELETE solo en relaciones; 257 pgTAP en
  verde. ADR 0018. Rama `feat/fase-3b-admin`.
- 2026-10-08: Fase 3B, tramo 2: feature `admin` con `CatalogManager` dirigido por configuración
  (13 catálogos y motivos) y layout `/admin/catalogos`; Vitest y Playwright del alta de un catálogo;
  `pnpm check` completo en verde. Rama `feat/fase-3b-admin`.
- 2026-10-08: Fase 3B, tramo 3: `access-api` y hooks; rutas `/admin/roles` (matriz de permisos con
  ámbito), `/admin/usuarios` (roles, activo/desactivar y vínculos) y `/admin/ambitos` (ámbitos de
  supervisor y designaciones); Playwright de crear un rol; `pnpm check` completo en verde. Rama
  `feat/fase-3b-access`.
- 2026-10-08: Fase 3B, tramo 4: `/admin/configuracion` (configuración esencial de la instancia) y
  pruebas Vitest del dominio. `pnpm check` completo en verde. **Fase 3B cerrada**.
- 2026-10-08: cierre de transiciones de 3A: recaptura, reclamaciones (abrir/resolver), marcar
  duplicado y reactivación (UI + dominio + hooks), sin migraciones; 80 Vitest y 9 Playwright en
  verde; `pnpm check` completo en verde. Rama `feat/fase-3a-transiciones`.
- 2026-10-08: cierre de 3A (supervisor y auxiliares): reasignar supervisor a equipo/supervisor y
  agregar auxiliar (UI + dominio + hooks), sin migraciones; 82 Vitest y 10 Playwright en verde;
  `pnpm check` completo en verde. Rama `feat/fase-3a-supervisor-auxiliares`.
- 2026-10-08: Fase 4A (evidencia offline): compresión `canvas`, cola `outbox` genérica con reintentos,
  evidencias en Dexie, subida reanudable con TUS y `evidence_add`, sincronización e indicador; 84
  Vitest y 11 Playwright en verde. ADR 0019. Rama `feat/fase-4a-offline`.
- 2026-10-08: Fase 4A (acciones offline): `isNetworkError`, cola `ticket_action`, registro de
  operaciones, `networkMode: 'always'`, mutex de Dexie y salto del procesamiento sin red; Playwright
  del técnico que inicia sin conexión. 88 Vitest y 11 Playwright en verde. Rama
  `feat/fase-4a-acciones-offline`.
- **Fase 2, Tramo 1 (base de autenticación)**: migración `auth_profiles_and_identity` con el
  disparador `on_auth_user_created` (crea `profiles` desde los metadatos de la cuenta), las RPC
  `me()` (perfil, roles y permisos en una llamada) y `profile_update()` (solo el perfil propio), y
  el **endurecimiento de permisos** (se retira `EXECUTE` a `anon`/`PUBLIC` de las funciones del
  núcleo, que los privilegios por defecto de Supabase concedían). Sin auto-registro
  (`enable_signup = false`) y cuatro **usuarios demo** ficticios en `seed.sql`. Pruebas pgTAP
  `90_auth_profiles.test.sql`; 200 pruebas en verde y `pnpm db:types`. Rama `feat/fase-2-auth`.
- **Fase 2, Tramo 2 (estructura de la app)**: feature `auth` (`api`, `domain`, `hooks`,
  `components`, `schemas`, `i18n`, `index`), `AuthProvider` (sesión + identidad con TanStack Query),
  guard `RequireAuth`/`RequirePermission` **por permiso**, layout `AppShell`, pantalla de acceso
  `/login`, panel `/`, "Mi perfil" `/perfil` y administración `/admin` (reservada a `user.manage`).
  Rutas protegidas con rutas sin ruta (`_authenticated`); `routes/index.tsx` pasa a
  `_authenticated/index.tsx`. React Hook Form + Zod (`react-hook-form`, `zod`,
  `@hookform/resolvers`, MIT); script `pnpm env:local` (`scripts/write-local-env.mjs`); pruebas:
  Vitest (dominio, esquemas, enrutado con sesión simulada) y Playwright (acceso, panel, salir,
  `/admin` restringido). `pnpm check` en verde. Rama `feat/fase-2-auth`.
- **Fase 3A, Tramo 1 (backend de operación)**: bucket privado `evidence` con políticas ligadas a
  `can_see_ticket` y RPC `evidence_add` (idempotente); RPC `ticket_assign_supervisor` (RN-06),
  `ticket_add_auxiliary` (RN-07) y `ticket_check_duplicates` (RN-29, sin crear); `can_see_ticket`
  incluye a los auxiliares y la reasignación genera su tramo de tiempo. Pruebas pgTAP
  (`95_flow_completion.test.sql`). ADR 0017. Rama `feat/fase-3a-operacion`.
- **Fase 3A, Tramo 2 (tiquets)**: features `catalogs` (lectura con selects dependientes) y `tickets`
  (acceso a datos, dominio, esquemas Zod, hooks); alta con **aviso de duplicados**, lista con
  filtros/paginación en la URL y detalle con **línea de tiempo** (`v_ticket_timeline` con
  visibilidad al solicitante), participantes y evidencias. Pruebas Vitest, pgTAP y Playwright. Las
  pruebas pgTAP de tiquets se aíslan con `truncate` transaccional. Rama `feat/fase-3a-operacion`.
- **Fase 3A, Tramo 3 (bandejas y técnico)**: acciones contextuales por estado y permiso
  (`allowedActions`), mutaciones de transición por RPC, evidencia en línea (subida + URL firmada),
  bandeja del supervisor (`/inbox`, ofertas + tiquets del equipo) y vista del técnico
  (`/mi-trabajo`). Prueba Playwright del flujo completo del técnico (asignar → evidencia `before` →
  iniciar → evidencia `after` → atender). 63 pruebas Vitest y 6 Playwright. `pnpm check` en verde.
- **Fase 3B, Tramo 1 (backend de administración)**: políticas RLS de escritura con
  `has_permission(...)` (`catalog.manage`, `role.manage`, `assignment.manage`, `user.manage`);
  `DELETE` solo en tablas de relación y catálogos que se desactivan, no se borran. **ADR 0018**
  (acota el ADR 0015: la RLS sigue para lectura y transiciones; la administración escribe por RLS).
  pgTAP `97_admin_writes.test.sql`. Rama `feat/fase-3b-admin`.
- **Fase 3B, Tramo 2 (catálogos y motivos)**: feature `admin` con un `CatalogManager` dirigido por
  configuración (tabla, columnas, campos y selects de tablas relacionadas) para los 13 catálogos y el
  árbol de motivos; layout `/admin` con `/admin/catalogos`. Pruebas Vitest (`form-values`) y
  Playwright (crear un equipo). `pnpm check` en verde. Rama `feat/fase-3b-admin`.
- **Fase 3B, Tramo 3 (roles, usuarios y ámbitos)**: rutas `/admin/roles` (alta/edición de roles y
  **matriz de permisos con ámbito**), `/admin/usuarios` (roles, activar/desactivar y **vínculos** con
  solicitantes/técnicos) y `/admin/ambitos` (ámbitos de supervisor con edificios y designaciones de
  técnicos). Prueba Playwright de crear un rol. `pnpm check` en verde. Rama `feat/fase-3b-access`.
- **Fase 3B, Tramo 4 (configuración)**: `/admin/configuracion` edita la configuración esencial de la
  instancia (etiqueta de equipo, política de validación, validación automática, ventana de
  reclamación, política de evidencia, patrón de folio y zona horaria). Pruebas Vitest del dominio.
  **Fase 3B cerrada** con tramos 1-4; quedan fuera (documentados) alta de cuentas por Edge Function,
  calendarios laborales, reglas de notificación/escalamiento y parámetros finos de duplicados.
- **Cierre de transiciones de 3A**: interfaz de recaptura (campos de captura + motivo, con selects
  dependientes), reclamaciones (abrir con motivo + descripción y resolver con resultado + motivo),
  marcar duplicado (buscar el original por folio) y reactivación. Dominio `allowedActions` ampliado y
  funciones puras de recaptura. Pruebas Vitest y Playwright (rechazar y reactivar). Sin migraciones.
  Rama `feat/fase-3a-transiciones`.
- **Cierre de 3A (supervisor y auxiliares)**: reasignar supervisor (a otro equipo, que re-rutea, o a
  un supervisor concreto) y agregar apoyo auxiliar; dominio `allowedActions` ampliado y un
  repositorio de supervisores. Pruebas Vitest y Playwright. Sin migraciones. Rama
  `feat/fase-3a-supervisor-auxiliares`.
- **Fase 4A (evidencia sin conexión)**: compresión con `canvas`, cola de salida genérica (`outbox`) con
  reintentos y aviso al terminar, almacén de evidencias en Dexie y **subida reanudable con TUS** +
  `evidence_add`; sincronización al abrir/`online`/visibilidad y aviso de "sin conexión" y pendientes.
  React Query con `networkMode: 'always'` en la mutación de evidencia (sin eso queda pausada offline).
  Prueba Playwright del técnico sin conexión. **ADR 0019**. Rama `feat/fase-4a-offline`.
- **Fase 4A (acciones offline)**: las transiciones del tiquet se encolan si fallan por red
  (`isNetworkError`) y se reenvían con el mismo `client_request_id`; registro de operaciones
  (`ticket-operations`), `networkMode: 'always'` en las mutaciones, cola serializada con un mutex y
  ordenada por secuencia, y sin procesar cuando no hay red. Prueba Playwright del técnico que sube la
  evidencia e inicia **sin conexión** y se sincroniza al reconectar. Rama
  `feat/fase-4a-acciones-offline`.
- **Fase 8, Fase 0 (rediseño de interfaz — sistema de temas)**: tokens movidos a
  `src/styles/themes.css` con 5 temas (`ocean` predeterminado, `neutral`, `emerald`, `violet`,
  `contrast`) en claro y oscuro, paleta de gráficos distinguible y tokens semánticos
  (`success`/`warning`/`info`); lógica pura en `lib/theme.ts` con pruebas; `ThemeProvider` y
  `ThemeToggle` en `components/shared`; script anti-parpadeo en `index.html`. **ADR 0038**;
  `docs/diseno-ui.md` iniciado. `pnpm check` en verde (136 Vitest, 404 pgTAP). Rama `feat/ui-temas`.
- **Fase 8, Fase 1 (rediseño de interfaz — armazón)**: nuevo feature `features/shell` con barra
  lateral agrupada (Operación / Análisis / Administración / Cuenta) colapsable en escritorio y
  cajón en móvil, barra superior con migas de pan, búsqueda global (`Cmd/Ctrl+K`, tiquets por
  folio), selector de tema y menú de usuario; el contenido usa el ancho disponible. La
  administración pierde su barra propia. **ADR 0039**; `docs/diseno-ui.md` actualizado. `pnpm
  check` en verde (136 Vitest, 12 Playwright, 404 pgTAP). Rama `feat/ui-shell`.
- **Fase 8, Fases 2-3 (componentes de datos y operación)**: tabla de datos propia
  (`DataTable`), `PageHeader` y `EmptyState` compartidos; insignias de estado con tokens
  semánticos; lista de tiquets con tabla en escritorio y tarjetas en móvil; detalle de tiquet a
  dos columnas (contenido + rail de acciones/metadatos). **ADR 0040**; `docs/diseno-ui.md`
  actualizado. `pnpm check` en verde (136 Vitest, 12 Playwright, 404 pgTAP). Rama `feat/ui-temas`.
- **Fase 8, Fases 4-5 (métricas, administración y accesibilidad)**: `PageHeader` en el tablero,
  filtros en tarjeta, panel de administración como cuadrícula de accesos; enlace "Saltar al
  contenido", `aria-current="page"` en la navegación e indicador offline con tokens semánticos.
  `docs/diseno-ui.md` completo. `pnpm check` en verde (136 Vitest, 12 Playwright, 404 pgTAP).
  Rama `feat/ui-temas`.
- **Rediseño de vistas, Etapa 1 (semilla de demostración)**: `supabase/seed.sql` ahora siembra
  **15 tiquets** que cubren los 11 estados, en dos edificios y dos equipos, con asignaciones,
  participantes, ofertas al supervisor, pausas, calificaciones, evidencias (metadatos) y una
  bitácora que genera los tramos de tiempo. Con esto las vistas (bandejas, tablero, métricas,
  duplicados, satisfacción y SLA) dejan de verse vacías, sobre todo para el administrador. Se
  aislaron tres pruebas pgTAP (87/88/89) que dependían de agregados globales truncando tiquets;
  pgTAP 404 en verde, Playwright 12 en verde.
- **Rediseño de vistas, Etapa 2 (Panel de inicio)**: nuevo feature `features/dashboard` con
  **números según rol** (mi trabajo / ofertas / activos / pausa / por validar / sin asignar /
  cerrados), **bandejas** (ofertas, mi trabajo, activos) y **acciones rápidas**; distinto del
  tablero global de `/metricas`. Se quitó `roleLabel` (sin uso) y la lista pasó a renderizar
  **tabla o tarjetas según el ancho** (`lib/use-media-query`) para no duplicar el DOM. **ADR 0041**.
  `pnpm check` en verde (138 Vitest, 12 Playwright, 404 pgTAP). Rama `feat/vistas-semilla`.
- **Rediseño de vistas, Etapa 3 (Operación)**: **lista** con chips de filtros activos y contador;
  **alta** por secciones, dos columnas con duplicados al lado, barra de guardado fija y aviso de
  cambios sin guardar; **detalle** con encabezado, **activity feed** con iconos y rail fijo con
  **acción primaria** (`pickPrimaryAction`) + menú "Más acciones"; **bandejas** con conteo por
  estado. Componentes compartidos `FormSection`, `FormActionsBar`, `FilterChips`. Se actualizaron
  los e2e de acciones secundarias. **ADR 0042**. `pnpm check` en verde (142 Vitest, 12 Playwright,
  404 pgTAP). Rama `feat/vistas-operacion`.
- **Semilla con nombres legibles (2026-10-09)**: `supabase/seed.sql` sin el sufijo `(ejemplo)` en
  catálogos, personas, motivos y descripciones; usuarios demo con nombres de persona (`Rosa
  Delgado`, `Sergio Ramírez`, `Luis Gómez`, `Ana Pérez`). Las pruebas pgTAP pasan a un juego de
  nombres propio (`Equipo Alfa`, `Categoría Alfa`, `Nivel A`, `Motivo de prueba`, …) para no
  compartir claves únicas con la semilla, y los e2e se actualizan. **ADR 0043**. Rama
  `feat/semilla-nombres-legibles`.
- **Guía de un tiquet (2026-10-09)**: nuevo `docs/guia-tiquets.md` con el ciclo completo del
  tiquet (qué contiene, los 11 estados, flujo, paso a paso, matriz de transiciones, qué acumula,
  tiempos, duplicados, concurrencia, permisos y reglas de oro), enlazado desde `docs/README.md`.
  Rama `docs/guia-tiquets`.
- **Evidencia por estado y acciones guiadas (2026-10-09)**: migración
  `20261009090000_evidence_state_rules.sql` que valida el **tipo de evidencia ↔ estado** en
  `evidence_add` y exige `claim` en `ticket_open_claim`; prueba pgTAP nueva (100) y ajuste de la
  50. En el frontend, **iniciar/atender/reclamar piden su evidencia** en un diálogo, el subidor
  libre se acota a los tipos válidos, el **alta** permite la **foto de solicitud**, y el **detalle**
  pone la data como columna principal con la **actividad en el sidebar**. **ADR 0044**.
  `pnpm check` en verde (147 Vitest, 12 Playwright, 409 pgTAP). Rama `feat/evidencia-y-detalle`.
- **Permisos de evidencia y acciones visibles (2026-10-09)**: permisos nuevos
  `evidence.attach` (subidor libre; supervisor/admin) y `ticket.record_progress` (paso
  "Registrar avance", `during`, con nota; técnico/supervisor/admin); el backend exige
  `evidence.attach` para la evidencia libre (`other`) y `evidence_add` acepta nota. En la
  interfaz, las acciones se muestran **todas por estado** con la primaria destacada y los
  **descartes al final en rojo**; el subidor y los tiempos manuales se **ocultan** sin permiso.
  **ADR 0045**. `pnpm check` en verde (147 Vitest, 12 Playwright, 413 pgTAP). Rama
  `feat/acciones-y-permisos`.
- **Contenedor de acciones responsivo (2026-10-09)**: las acciones abren **modal centrado en
  escritorio** y **hoja inferior en móvil** (`action-container.tsx`), con alto máximo y
  desplazamiento; los formularios del contenedor ya no llevan borde interno; la hoja inferior de
  móvil lleva padding. `pnpm check` en verde (147 Vitest, 12 Playwright, 413 pgTAP). Rama
  `feat/acciones-modal`.
- **Campo de archivo con botones y cámara (2026-10-09)**: nuevo `FileField`
  (`components/shared/file-field.tsx`) con botones visibles, cámara en móvil
  (`capture="environment"`), miniatura y acciones "Quitar"/"Sustituir"; se aplica en la acción
  guiada, el subidor libre y el alta. Se movió `DEDICATED` fuera de `action-container.tsx`
  (ahora en `ticket-action-handlers.ts`) porque exportar una constante junto a componentes rompía
  el Fast Refresh de Vite (la hoja inferior no tomaba los cambios sin recargar). `pnpm check` en
  verde (147 Vitest, 12 Playwright, 413 pgTAP). Rama `feat/campo-archivo`.
- **Fase 8, Etapa 4 (Administración)**: encabezado único por pantalla (`PageHeader`); **catálogos**
  con `DataTable`, estado con tokens y `EmptyState`; **roles en master-detail** con el alta en
  modal y la **matriz de permisos agrupada por área**; **usuarios** como tabla con **modal de
  roles**; **ámbitos** en **pestañas**; **configuración** por **secciones** con barra de guardado y
  `toast`; calendarios e integraciones sin títulos duplicados. **ADR 0046**. `pnpm check` en verde
  (147 Vitest, 12 Playwright, 413 pgTAP). Rama `feat/vistas-admin`.
- **Fase 8, Etapa 5 (Métricas, acceso y perfil) — cierre del rediseño**: KPI **agrupados por área**
  (Carga · Tiempos · Calidad · SLA y satisfacción), **filtros sticky**, y tablas de métricas con
  `DataTable` y `EmptyState`; **acceso** en dos columnas en escritorio y centrado en móvil;
  **perfil** por secciones con roles y zona horaria. **ADR 0047**. `pnpm check` en verde (147
  Vitest, 12 Playwright, 413 pgTAP). **Rediseño de interfaz (Fases 8.0–8.5) completo.** Queda como
  mejora opcional la **regresión visual con capturas de Playwright**. Rama `feat/vistas-metricas`.
- **Rediseño total del tablero de métricas (Etapa 6)**: `/metricas` pasa de un scroll largo a
  **pestañas por tema** (Resumen · Tiempos · Calidad · SLA y satisfacción), con una **barra de
  herramientas sticky** que concentra rangos rápidos (7 · 30 · 90 días y "Todo"), fechas, filtros
  por catálogo, **selector de dimensión** y **exportación CSV/XLSX**; una fila de **KPI destacados**
  siempre visible. Sin cambios de lógica (mismas funciones puras y hooks; solo se añade
  `rangeForDays`). Componentes nuevos: `MetricsToolbar`, `MetricsHero`, `MetricsTabs`,
  `MetricsExport` y `KpiGrid`. **ADR 0048**. `pnpm check` en verde (148 Vitest, 12 Playwright, 413
  pgTAP). Rama `feat/metricas-rediseno`.
- **Métricas: deltas, filtros en el servidor y nuevos indicadores (Etapa 7)**: **deltas** vs periodo
  anterior en los KPI de tiquets (cliente); **dimensión solicitante** y **marca de reasignación de
  técnico**; y los indicadores agregados pasan a **funciones `metrics_*` en el servidor** que
  respetan la barra de filtros (antes las vistas globales la ignoraban). Nuevos: pestaña **Equipo**
  (carga por técnico), **rechazos/cancelaciones por motivo** y **ruteo y toma**; la barra deja de ser
  **sticky**. **Regresión visual con Playwright opt-in** (`pnpm test:visual`, fuera de la compuerta)
  en `apps/web/visual`. **ADR 0049**. `pnpm check` en verde (153 Vitest, 12 Playwright, 426 pgTAP).
  Rama `feat/metricas-deltas-filtros`.
- **Métricas: dimensiones simultáneas y periodo comparado (Etapa 8)**: se quita el selector
  "Agrupar por"; el **Resumen muestra todas las dimensiones a la vez** (rejilla de cinco gráficas y
  tabla combinada con columna "Dimensión"; exportación con esa columna). Los **KPI quedan globales**
  del rango. El **delta muestra las fechas comparadas** ("vs 30 sep – 7 oct") y `rangeForDays` pasa
  a devolver exactamente N días. **ADR 0050**. `pnpm check` en verde (155 Vitest, 12 Playwright, 426
  pgTAP). Rama `feat/metricas-dimensiones`.
- **Métricas: Resumen por cantidades y tiempos en su pestaña (Etapa 9)**: las cinco gráficas por
  dimensión del **Resumen muestran tiquets** (no tiempos) y la tabla combinada queda en **Dimensión ·
  Agrupación · Tiquets · Reasignación · Recaptura**; el **desglose por dimensión con tiempos** pasa a
  la pestaña **Tiempos**. Sin cambios de dominio ni de base de datos. **ADR 0051**. `pnpm check` en
  verde (155 Vitest, 12 Playwright, 426 pgTAP). Rama `feat/metricas-resumen-cantidades`.
- **Métricas: Resumen compacto (Etapa 10)**: las gráficas dejan de usar relación 16:9 y pasan a
  **altura fija** (volumen 2/3 + ruteo 2×2 en una fila; cinco dimensiones en `sm:2 / xl:5`, `h-36`,
  **top 5**); el detalle por dimensión y la antigüedad van en dos columnas con **desplazamiento
  interno**. Sin cambios de dominio ni de base de datos. `pnpm check` en verde (155 Vitest, 12
  Playwright, 426 pgTAP). Rama `feat/metricas-resumen-compacto`.
- **Métricas: una sección por dimensión (Etapa 11)**: el detalle deja de ser una tabla plana con
  columna "Dimensión" y pasa a **una tarjeta por dimensión** (gráfica de tiquets + tabla con
  Agrupación · Tiquets · Reasignación · Recaptura y scroll); en **Tiempos**, el mismo formato con las
  columnas de tiempo. Componentes `DimensionSection`/`DimensionSections` (sustituyen a las tablas
  combinadas). Sin cambios de dominio ni de base de datos. `pnpm check` en verde (155 Vitest, 12
  Playwright, 426 pgTAP). Rama `feat/metricas-secciones-dimension`.
- **Métricas: duplicados por dimensión (Etapa 12)**: la tabla plana de duplicados en **Calidad** pasa
  a **una tarjeta por dimensión** (Agrupación · Tiquets · Duplicados · Tasa) y los KPI de duplicados
  quedan aparte. La migración `20261009120000` añade **categoría** a
  `metrics_duplicates_by_dimension` (faltaba) con pgTAP. Se añade captura visual de Calidad. `pnpm
  check` en verde (155 Vitest, 12 Playwright, 427 pgTAP). Rama `feat/metricas-duplicados-dimension`.
- **Métricas: reacomodo de Calidad (Etapa 13)**: los dos desgloses **por motivo** (pausas y
  rechazos/cancelaciones) comparten fila; los **KPI de duplicados** pasan a una fila compacta y todo
  el bloque de **duplicados** (KPI + tarjetas por dimensión) queda agrupado bajo su título. Solo
  `quality-tab.tsx`; sin cambios de datos. `pnpm check` en verde (155 Vitest, 12 Playwright, 427
  pgTAP). Rama `feat/metricas-calidad-layout`.
- **Métricas: Calidad sin hueco (Etapa 14)**: se quita la tarjeta "Duplicados" suelta (que con un solo
  indicador dejaba un hueco junto al gráfico); el **tiempo medio hasta marcarse** (y las alertas, si
  las hay) pasa a **línea de resumen en el encabezado** de "Duplicados por dimensión", y **Pausas**
  (altura fija `h-48`) comparte fila con **Rechazos y cancelaciones**. Solo `quality-tab.tsx`,
  `duplicates-summary.tsx` y `pauses-chart.tsx`; sin cambios de datos. `pnpm check` en verde (155
  Vitest, 12 Playwright, 427 pgTAP). Rama `feat/metricas-calidad-reubicacion`.
- **Métricas: más gráficas y duplicados como KPI (Etapa 15)**: el **tiempo medio hasta marcarse**
  pasa a la **fila de KPI** de Calidad (6 tarjetas), **rechazos/cancelaciones** y la **tasa de
  duplicados por dimensión** son **gráficas**, el **cumplimiento por prioridad** (SLA) y los
  **tiquets por técnico** (Equipo) también. Helper puro `duplicateRateByDimension` con prueba;
  se eliminan `duplicates-summary`, `sla-section` y `reject-cancel-section`. Se añaden capturas
  visuales de **SLA** y **Equipo**. `pnpm check` en verde (157 Vitest, 12 Playwright, 427 pgTAP).
  Rama `feat/metricas-graficas`.
- **Métricas: filtros uniformes (Etapa 16)**: la barra del tablero adopta el **mismo patrón que la
  lista de Operación** (contenedor `rounded-xl border bg-card p-4`, controles en línea + **chips de
  filtros activos** con `FilterChips`); la **exportación CSV/XLSX** se mueve a las **acciones del
  encabezado** (`PageHeader`). Sin patrones nuevos ni cambios de datos. `pnpm check` en verde (157
  Vitest, 12 Playwright, 427 pgTAP). Rama `feat/metricas-filtros-uniformes`.
- **Métricas: volumen por mes (Etapa 17)**: la gráfica "Tiquets por día" pasa a **"Tiquets por mes"**
  (misma gráfica de **línea**, agrupada por mes con `volumeByMonth` y etiquetas `formatMonthLabel`);
  `volumeByDate` se retira. Pruebas puras nuevas. Sin cambios de datos. `pnpm check` en verde (158
  Vitest, 12 Playwright, 427 pgTAP). Rama `feat/metricas-volumen-mensual`.
- **Panel de inicio ampliado (Etapa 18)**: el Panel (`/`) gana **KPI por rol** (hasta 6, con trabajo
  activo/primera resolución/SLA/satisfacción), **gráficas** (tiquets por mes y por estado),
  **"Requiere tu atención"** (abiertos más antiguos) y **actividad reciente**; conserva bandejas y
  acciones. Reutiliza hooks/dominio de métricas (su `index.ts` expone más) y no toca la base. **ADR
  0052**. `pnpm check` en verde (160 Vitest, 12 Playwright, 427 pgTAP). Rama `feat/panel-ampliado`.
- **Datos locales limpios (Etapa 19)**: los e2e dejaban **70 tiquets y 14 equipos "E2E"** en la base
  local; se añade `scripts/clean-test-data.mjs` + `pnpm db:clean` (borra tiquets `%E2E%` y equipos
  "Equipo E2E", deshabilitando los triggers de solo-agregar de `ticket_events`/`evidence` durante la
  transacción) y se ejecuta **al terminar los e2e** (`pnpm test`, omite en CI). La **semilla** se
  amplía a **21 tiquets en 7 meses** (históricos cerrados legibles) para dar contexto temporal. Sin
  cambios de esquema. `pnpm check` en verde (160 Vitest, 12 Playwright, 427 pgTAP). Rama
  `feat/datos-limpios`.
- **Panel: bandejas por rol y tiempo transcurrido (Etapa 20)**: se quita **"Requiere tu atención"**,
  la bandeja **"Mi trabajo"** y la gráfica **"Por estado"**; quedan indicadores, **"Tiquets por mes"**,
  **actividad** y **una bandeja por rol** (técnico: sus activos; supervisor: ofertas + equipo; admin:
  activos + ofertas). Los **banners** muestran el **tiempo transcurrido** (`formatElapsed` en
  `lib/format`, prop `showElapsed` de `TicketList`). `countByStatus`/`openAging` retirados. `pnpm
  check` en verde (159 Vitest, 12 Playwright, 427 pgTAP). Rama `feat/panel-bandejas-rol`.
- **Integridad de participantes (Etapa 21)**: se impide que un mismo técnico quede **duplicado** en
  `ticket_participants` (activo) con un **índice único parcial** y saneo previo; asignar técnico
  **reutiliza/promueve** y cierra al líder anterior; agregar auxiliar valida cualquier activa; un
  **trigger** cierra participaciones al cerrar/terminar el tiquet o cambiar de ciclo; la UI **excluye**
  a los activos. La **semilla** estrena **7 técnicos, 9 categorías, 14 subcategorías, 23 problemas** y
  **designaciones** (`technician_categories`). **ADR 0053**. `pnpm check` en verde (159 Vitest, 12
  Playwright, 431 pgTAP). Rama `feat/participantes-integridad`.
- **Tomar la oferta al abrir (Etapa 22)**: al abrir el detalle de un tiquet `registered` con **oferta
  activa**, el supervisor lo **toma** automáticamente (`ticket_take`) y pasa a **"Tomado por
  supervisor"** (etiqueta renombrada desde "Con supervisor"); desde ahí puede **asignar técnico** o
  **reasignar supervisor**. Nueva prueba e2e (`e2e/take-offer.spec.ts`). **ADR 0054**. `pnpm check` en
  verde (159 Vitest, 13 Playwright, 431 pgTAP). Rama `feat/auto-tomar`.
- **Visibilidad del solicitante configurable (Etapa 23)**: el conjunto por defecto de
  `requester_visible_event_types` se amplía a **18** tipos (recaptura, reasignaciones y prioridad) y el
  administrador lo **edita en Configuración** (casillas por tipo). Migración que ajusta el default y la
  fila existente; pgTAP de la vista ampliado. **ADR 0055**. `pnpm check` en verde (159 Vitest, 13
  Playwright, 433 pgTAP). Rama `feat/visibilidad-solicitante`.
- **Clasificación del alta (Etapa 24)**: el alta deja de pedir **tipo de servicio**, **prioridad** y
  **canal**. El tipo de servicio se captura en la **atención** (`ticket_attend(..., p_service_type_id)`,
  obligatorio); la **prioridad** se deriva de `problems.default_priority_id` con respaldo en
  `instance_settings.default_priority_id` (cambiable solo por supervisor/admin); el **canal** se fuerza
  al de plataforma (`channels.is_platform`) cuando registra el propio solicitante y es elegible a nombre
  de otro; el **solicitante** sale del catálogo (con "yo" preseleccionado). Administración permite
  editar prioridad por defecto del problema, canal de plataforma y prioridad por defecto de la
  instancia. **ADR 0056**. `pnpm check` en verde (159 Vitest, 13 Playwright, 440 pgTAP). Rama
  `feat/clasificacion-tiquet`.
- **Rediseño de Administración (Etapa 25)**: marco común (`AdminPage`/`AdminToolbar`), catálogos con
  **rail lateral** (escritorio) y **tablas específicas por entidad** (columnas reales alineadas,
  relaciones con nombre, estado como `Switch`, acciones en menú `⋯`), **búsqueda y orden en cliente**
  (`lib/sort`, `catalog-list`, `user-list`, con pruebas); **diálogos unificados** (`EntityDialog`
  centrado/hoja inferior + `EntityForm` con pie fijo + secciones); `DataTable` compartida extendida
  (`align`/`sortable`/`empty`); roles, usuarios, ámbitos e integraciones sobre las mismas piezas. El
  inicio `/admin` se agrupa por áreas. **ADR 0057**. `pnpm check` en verde (174 Vitest, 13 Playwright,
  440 pgTAP). Rama `feat/admin-rediseno`.
- **Usuarios, Ámbitos y Calendarios (Etapa 26)**: Usuarios en pestañas **Cuentas / Vínculos** (tabla
  con vínculo y tablas por catálogo con diálogo de búsqueda para asignar la cuenta); Ámbitos con
  **tablas + diálogos** (supervisores con edificios en diálogo con búsqueda; designaciones por técnico
  con chips quitables); Calendarios con **rail + detalle por secciones**, alta/edición en diálogo,
  franjas y festivos como **tablas**, con guardado explícito de cabecera y cambios inmediatos.
  Utilidades puras probadas (`scope-list`, `user-list`). **ADR 0058**. `pnpm check` en verde (180
  Vitest, 13 Playwright, 440 pgTAP). Rama `feat/admin-usuarios-ambitos-calendarios`.
- **Importación de catálogos (Etapa 27)**: plantilla **XLSX** generada en la app (una hoja por
  catálogo en orden de dependencias, hoja de listas y validación de datos), **dry run** por catálogo y
  **confirmación** que upserta por **clave natural** con RPC **atómica por hoja** y **lista blanca**;
  referencias por nombre resueltas en cliente (solicitantes/técnicos por nombre + padre); **historial**
  de cargas. Funciones puras probadas (`catalog-import`). **ADR 0059**. `pnpm check` en verde.
  Rama `feat/importar-catalogos`.
- **Subestados de pausa (Etapa 28)**: la app usa la jerarquía del núcleo. Acción **"Avanzar
  subestado"** (solo a un **hijo directo**, validado en `ticket_advance_pause`), `ticket_pause` exige
  motivo del uso `pause`, nueva función `ticket_pause_steps`; selector de motivo **jerárquico**,
  **panel de pausa** con subestado actual y pasos, y árbol de **Motivos** en Administración. Funciones
  puras probadas (`reasons`, `pause`); e2e de pausa → avanzar → reanudar. **ADR 0060**. `pnpm check`
  en verde. Rama `feat/pausa-subestados`.
- **Pausa por motivo/subestado (Etapa 29)**: al pausar se elige el **motivo** (raíz); **gestionar**
  cambia el **subestado** (cualquier descendiente del motivo); **reanudar exige un subestado** (hijo
  directo del motivo). `ticket_pauses.root_reason_id`, `ticket_pause_state`, nueva firma de
  `ticket_resume`, helper `reason_is_descendant_or_self` y **tramos por subestado**. Panel con motivo,
  subestado actual e historial. **ADR 0061**. `pnpm check` en verde. Rama
  `feat/pausa-motivo-subestados`.
