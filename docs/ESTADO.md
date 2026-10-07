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

## Siguiente

Fase 0, tarea 1: crear el monorepo siguiendo `docs/configuracion-inicial.md`.

## Hoja de ruta

El núcleo se construye y se puede usar **sin ninguna integración**. Las integraciones y la
migración van después, sobre un núcleo ya estable.

### Fase 0 — Arranque (sin dependencias de negocio)
- [ ] Monorepo pnpm: `apps/web`, `packages/shared`, `supabase/`, `deploy/`, `docs/`, `scripts/`
- [ ] App Vite + React + TypeScript con Tailwind, shadcn/ui (incluido `chart`/Recharts),
      TanStack Router (rutas por carpetas) y TanStack Query
- [ ] Supabase local funcionando, cliente tipado, `pnpm db:types`
- [ ] PWA configurada (manifest, iconos, `registerType: 'prompt'`) y esqueleto Dexie (`outbox`, `evidencias`)
- [ ] Herramientas que hacen cumplir las convenciones: TypeScript estricto, ESLint con los
      límites de tamaño, `dependency-cruiser` o `eslint-plugin-boundaries`, Prettier, knip,
      Husky + lint-staged, commitlint
- [ ] **`pnpm check:agnostic`**: script con lista configurable de nombres de terceros
      (incluye los nombres de este proyecto de origen) y rutas permitidas
- [ ] Vitest, Playwright y prueba pgTAP de humo
- [ ] Scripts de raíz, incluido **`pnpm check`** (lint + typecheck + check:agnostic + test + db:test + build)
- [ ] CI que ejecuta la compuerta completa
- [ ] `README.md` (levantar el proyecto en 10 minutos), `.env.example`, `.gitignore`
- [ ] ADR iniciales en `docs/decisions/`: Vite + React como SPA, Supabase, Recharts en lugar
      de ECharts, cola offline con Dexie, modelo de bloqueos dirigido por datos, independencia
      del núcleo
- [ ] Pantalla de inicio "Axia" visible y `pnpm check` en verde

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

_(el agente anota aquí comandos que funcionan, versiones instaladas y particularidades del equipo)_

## Registro de sesiones

_(una línea por sesión: fecha, qué se hizo, qué quedó pendiente)_
