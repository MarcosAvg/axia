# Tableros de bandeja — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir un tablero de solo lectura por bandeja (`/inbox/tablero` y `/mi-trabajo/tablero`) sin alterar el diseño de las bandejas.

**Architecture:** Una función pura agrupa `TicketListItem` por estado activo; un componente `TicketBoard` pinta columnas y tarjetas; dos rutas no anidadas consumen las consultas existentes (`useTicketsList`, `useMyOffers`, `useMyWork`). No hay cambios de servidor ni de base.

**Tech Stack:** React 19, TanStack Router, TanStack Query, Tailwind, shadcn/ui, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-06-tableros-bandeja-design.md`

## Global Constraints

- Textos de interfaz en español (es-MX); código, tablas y columnas en inglés.
- Los componentes no llaman a `/api` directamente: usan `features/*/api` y los hooks del feature.
- La lógica de negocio va en funciones puras con pruebas.
- No añadir dependencias.
- No cambiar el diseño ni el comportamiento de Bandeja y Mi trabajo; solo se agrega un botón de acceso.
- Antes de integrar: `pnpm check` completo en verde.

## Review Focus

- Totales mayores a 100: el tablero no debe fingir que muestra todo; debe avisar y enlazar a la lista.
- Tiquets con datos opcionales nulos (edificio, categoría, prioridad): la tarjeta no debe romperse ni mostrar «null».
- Cambios offline pendientes: la tarjeta debe reflejar el estado proyectado e indicar «Sin sincronizar».
- Permisos: acceder por URL directa sin `ticket.take_offer` (Bandeja) o sin perfil de técnico (Mi trabajo) debe mostrar «Sin acceso».
- Móvil: las siete columnas deben poder recorrerse sin desbordar la página ni romper el foco del teclado.

---

### Task 1: Agrupamiento por estado

**Files:**
- Create: `apps/web/src/features/tickets/domain/board.ts`
- Test: `apps/web/src/features/tickets/domain/board.test.ts`

**Interfaces:**
- Consumes: `ACTIVE_STATUSES` de `./status`, `TicketListItem` y `TicketStatus` de `./types`.
- Produces:
  - `BOARD_STATUSES: readonly TicketStatus[]`
  - `interface BoardColumn { status: TicketStatus; items: TicketListItem[] }`
  - `groupTicketsByStatus(items: readonly TicketListItem[], statuses?: readonly TicketStatus[]): BoardColumn[]`

- [ ] **Step 1: Escribir la prueba que falla**

Cubrir: orden fijo de columnas, columnas vacías presentes, orden descendente por `reportedAt`
dentro de la columna y exclusión de estados finales.

- [ ] **Step 2: Ejecutar la prueba y verla fallar**

Run: `pnpm --filter @axia/web test:unit src/features/tickets/domain/board.test.ts`
Expected: FAIL porque `./board` no existe.

- [ ] **Step 3: Implementar `groupTicketsByStatus`**

`BOARD_STATUSES` es `ACTIVE_STATUSES`. La función devuelve una columna por estado recibido,
filtra los tiquets de ese estado y los ordena por `reportedAt` descendente sin mutar la entrada.

- [ ] **Step 4: Ejecutar la prueba y verla pasar**

Run: `pnpm --filter @axia/web test:unit src/features/tickets/domain/board.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/tickets/domain/board.ts apps/web/src/features/tickets/domain/board.test.ts
git commit -m "feat(web): agrupa tiquets por estado para el tablero"
```

---

### Task 2: Componente del tablero y textos

**Files:**
- Create: `apps/web/src/features/tickets/components/ticket-board.tsx`
- Create: `apps/web/src/features/tickets/components/ticket-board.test.tsx`
- Modify: `apps/web/src/features/tickets/i18n.ts` (bloque `board`)
- Modify: `apps/web/src/features/tickets/index.ts` (exportar `TicketBoard`)

**Interfaces:**
- Consumes: `groupTicketsByStatus`, `BoardColumn`, `BOARD_STATUSES` de Task 1; `statusLabels` e `ticketMessages` de `../i18n`; `formatDateTime`/`formatElapsed` de `@/lib/format`; insignias existentes.
- Produces: `TicketBoard({ items, offeredIds, emptyColumnLabel? }: { items: TicketListItem[]; offeredIds?: ReadonlySet<string>; emptyColumnLabel?: string })`.

- [ ] **Step 1: Escribir la prueba que falla**

La prueba renderiza el tablero y comprueba: los siete encabezados de columna, el conteo por
columna, una tarjeta con folio y descripción, la insignia «Oferta para ti» solo para los ids
recibidos y la ausencia de tarjetas en columnas vacías. Se mockea `Link` de TanStack Router para
renderizar un `<a>`.

- [ ] **Step 2: Ejecutar la prueba y verla fallar**

Run: `pnpm --filter @axia/web test:unit src/features/tickets/components/ticket-board.test.tsx`
Expected: FAIL porque `./ticket-board` no existe.

- [ ] **Step 3: Implementar el componente y los textos**

Columnas: `section` con encabezado `h2`, contador e insignias. Tarjeta: `Link` al detalle con
folio, prioridad, descripción, metadatos, antigüedad e insignias de oferta, sin ruteo, posible
duplicado y sin sincronizar. Contenedor horizontal con `overflow-x-auto` y columnas
`w-[80vw] max-w-72 shrink-0 snap-start`. Textos nuevos en `ticketMessages.board`.

- [ ] **Step 4: Ejecutar la prueba y verla pasar**

Run: `pnpm --filter @axia/web test:unit src/features/tickets/components/ticket-board.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/tickets/components/ticket-board.tsx apps/web/src/features/tickets/components/ticket-board.test.tsx apps/web/src/features/tickets/i18n.ts apps/web/src/features/tickets/index.ts
git commit -m "feat(web): componente de tablero de tiquets"
```

---

### Task 3: Tamaño de página y filtros sin estado

**Files:**
- Modify: `apps/web/src/features/tickets/api/tickets-api.ts` (`fetchTickets`)
- Modify: `apps/web/src/features/tickets/hooks/use-tickets.ts` (`useTicketsList` y su clave)
- Modify: `apps/web/src/features/tickets/components/ticket-filter-fields.tsx`
- Modify: `apps/web/src/features/tickets/components/ticket-filters.tsx`
- Modify: `apps/web/src/features/tickets/components/ticket-filters-mobile.tsx`
- Test: `apps/web/src/features/tickets/components/ticket-filters.test.tsx` (si el patrón existente lo permite)

**Interfaces:**
- Consumes: API existente `GET /api/tickets` con `pageSize` (máximo 100).
- Produces:
  - `fetchTickets(filters, page, pageSize = TICKETS_PAGE_SIZE)`
  - `useTicketsList(filters, page, pageSize = TICKETS_PAGE_SIZE)`
  - `FilterFieldsProps.showStatus?: boolean` y `TicketFiltersProps.showStatus?: boolean`, por defecto `true`.

- [ ] **Step 1: Escribir la prueba que falla**

Comprobar que con `showStatus={false}` no aparece el desplegable «Estado» y con el valor por
defecto sí aparece.

- [ ] **Step 2: Ejecutar la prueba y verla fallar**

Run: `pnpm --filter @axia/web test:unit src/features/tickets/components/ticket-filters.test.tsx`
Expected: FAIL por la prop desconocida o el desplegable presente.

- [ ] **Step 3: Implementar**

Añadir `pageSize` opcional a `fetchTickets` y `useTicketsList`, incluyéndolo en la clave de
consulta. Propagar `showStatus` a los campos de escritorio y móvil; `buildFilterSelects` omite el
estado cuando es `false`. La lista y las bandejas existentes no cambian porque el valor por
defecto es `true`.

- [ ] **Step 4: Ejecutar la prueba y verla pasar**

Run: `pnpm --filter @axia/web test:unit src/features/tickets/components/ticket-filters.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/tickets/api/tickets-api.ts apps/web/src/features/tickets/hooks/use-tickets.ts apps/web/src/features/tickets/components/ticket-filter-fields.tsx apps/web/src/features/tickets/components/ticket-filters.tsx apps/web/src/features/tickets/components/ticket-filters-mobile.tsx apps/web/src/features/tickets/components/ticket-filters.test.tsx
git commit -m "feat(web): tamaño de página y filtros sin estado para el tablero"
```

---

### Task 4: Tablero de Bandeja

**Files:**
- Create: `apps/web/src/routes/_authenticated/inbox_.tablero.tsx`
- Modify: `apps/web/src/routes/_authenticated/inbox.tsx` (botón «Ver tablero»)

**Interfaces:**
- Consumes: `useTicketsList`, `useMyOffers`, `useAuth`, `RequirePermission`, `TicketFilters`, `TicketBoard`, `merge` no aplica; `ACTIVE_STATUSES`, `ticketMessages`, `ticketListSearchSchema`.
- Produces: ruta `/inbox/tablero`.

- [ ] **Step 1: Implementar la ruta**

`validateSearch` con `ticketListSearchSchema`. Consulta de equipo con
`useTicketsList({ statuses: ACTIVE_STATUSES, buildingId, categoryId, search }, 1, 100)`.
Ofertas con `useMyOffers(identity?.userId)` para construir `Set` de ids. Encabezado con «Ver
lista» a `/inbox`, filtros con `showStatus={false}` y aviso si `total > items.length`.

- [ ] **Step 2: Añadir el botón «Ver tablero» a Bandeja**

En `PageHeader.actions`, con `Button` variante `outline` y `Link` a `/inbox/tablero`.

- [ ] **Step 3: Verificar tipos y lint**

Run: `pnpm --filter @axia/web typecheck && pnpm --filter @axia/web lint`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/routes/_authenticated/inbox_.tablero.tsx apps/web/src/routes/_authenticated/inbox.tsx apps/web/src/routeTree.gen.ts
git commit -m "feat(web): tablero de bandeja"
```

---

### Task 5: Tablero de Mi trabajo

**Files:**
- Create: `apps/web/src/routes/_authenticated/mi-trabajo_.tablero.tsx`
- Modify: `apps/web/src/routes/_authenticated/mi-trabajo.tsx` (botón «Ver tablero»)

**Interfaces:**
- Consumes: `useMyWork`, `useAuth`, `RequirePermission`, `RequireTechnician`, `TicketBoard`, `ticketMessages`.
- Produces: ruta `/mi-trabajo/tablero`.

- [ ] **Step 1: Implementar la ruta**

Mismo patrón que Bandeja, sin filtros y con el encabezado «Ver lista» a `/mi-trabajo`.

- [ ] **Step 2: Añadir el botón «Ver tablero» a Mi trabajo**

En `PageHeader.actions`.

- [ ] **Step 3: Verificar tipos y lint**

Run: `pnpm --filter @axia/web typecheck && pnpm --filter @axia/web lint`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/routes/_authenticated/mi-trabajo_.tablero.tsx apps/web/src/routes/_authenticated/mi-trabajo.tsx apps/web/src/routeTree.gen.ts
git commit -m "feat(web): tablero de Mi trabajo"
```

---

### Task 6: E2E, documentación y cierre

**Files:**
- Create: `apps/web/e2e/board.spec.ts`
- Modify: `docs/guides/uso.md`
- Create: `docs/decisions/0121-tableros-bandeja.md`
- Modify: `docs/internal/estado.md`

**Interfaces:**
- Consumes: rutas y botones de Tasks 4 y 5.

- [ ] **Step 1: Escribir el E2E `@smoke`**

Supervisor: `/inbox` → «Ver tablero» → encabezados de columna visibles → clic en una tarjeta →
detalle. Técnico: `/mi-trabajo` → «Ver tablero» → columnas visibles. Solicitante: `/inbox/tablero`
y `/mi-trabajo/tablero` muestran «Sin acceso».

- [ ] **Step 2: Ejecutar el smoke dirigido**

Run: `pnpm --filter @axia/web exec playwright test e2e/board.spec.ts`
Expected: PASS.

- [ ] **Step 3: Documentar**

Guía de uso con los dos accesos; ADR 0121 con la decisión de solo lectura, rutas no anidadas,
ofertas marcadas sin duplicar y límite de 100; estado del proyecto con la tarea y su evidencia.

- [ ] **Step 4: Compuerta completa**

Run: `AXIA_ENV_FILE=/dev/null pnpm check`
Expected: código 0, incluido build y Playwright.

- [ ] **Step 5: Commit e integración**

```bash
git add apps/web/e2e/board.spec.ts docs/guides/uso.md docs/decisions/0121-tableros-bandeja.md docs/internal/estado.md
git commit -m "docs: tableros de bandeja y evidencia"
git switch main
git merge --ff-only feat/tableros-bandeja
```
