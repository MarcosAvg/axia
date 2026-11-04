# Fases exclusivas y desenlaces — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el tiempo por fase cubra siempre el ciclo completo del tiquet y que rechazados, cancelados y duplicados se midan como desenlaces propios, sin mezclarse con los indicadores de servicio completado.

**Architecture:** Una fase primaria exclusiva por tiquet en `time_spans`, derivada de los eventos y respaldada por un índice único parcial. La base de métricas deja de excluir estados; el desenlace (`closed`, `rejected`, `cancelled`, `duplicate`, `open`) se expone como dimensión y filtro, y cada indicador declara su universo.

**Tech Stack:** PostgreSQL 17, Drizzle/Fastify, React/Vite, Vitest, Playwright.

**Spec:** Decisión tomada en la conversación del 2026-11-04; se documenta en el ADR 0114.

## Global Constraints

- Migraciones nuevas en `apps/server/db/migrations/`; nunca editar una migración integrada.
- Fechas en `timestamptz`; total = `coalesce(closed_at, now()) - reported_at`.
- Código, tablas y columnas en inglés; textos de interfaz en español (es-MX).
- Sin RLS: permisos en consultas y repositorios; pruebas positivas y negativas.
- Nada de `unclassified` en la barra de fases.
- Duplicados quedan fuera de SLA, resolución, primera resolución y carga, pero dentro de volumen, tasa y tiempo de revisión.
- Rechazados y cancelados quedan dentro de volumen y esfuerzo, fuera de SLA/resolución/primera resolución.
- `pnpm check:fast` durante el desarrollo; `pnpm check` antes de integrar.

## Review Focus

- Un tiquet cancelado desde `registered` debe tener una fase `supervisor_response` que cubra hasta `closed_at`, no un hueco.
- Un tiquet reabierto debe abrir una fase nueva y no dejar el tramo de reclamación abierto.
- Reasignación y revisión de duplicado no deben sumar en la barra de fases.
- El filtro `outcome` no debe romper el alcance por permiso ni el filtro de fechas.
- Los promedios de resolución y SLA no deben incluir rechazados, cancelados ni duplicados.

---

### Task 1: Fase primaria exclusiva y cobertura

**Files:**
- Create: `apps/server/db/migrations/0023_pending_take_phase.sql`
- Create: `apps/server/db/migrations/0024_primary_phase_machine.sql`
- Create: `apps/server/test/db/ticket-phase-coverage.test.ts`
- Modify: `apps/server/test/db/tickets-read.test.ts`
- Modify: `apps/server/test/db/migration.test.ts`

**Interfaces:**
- Produces: `public.sync_ticket_phase(p_ticket_id uuid, p_at timestamptz, p_reason_id uuid, p_subject_user_id uuid, p_subject_technician_id uuid, p_subject_requester_id uuid, p_force_new boolean)`.
- Produces: `public.v_ticket_phase_coverage(id uuid, status public.ticket_status, total_time interval, phase_time interval, delta interval)`.
- Produces: `time_spans_one_open_phase` unique index.

- [ ] **Step 1: Write the failing coverage test**

Create `ticket-phase-coverage.test.ts` using `buildTicketFixtures()`. Insert `taken`, `assigned_technician`, `started`, `attended`, `validated` events with explicit `occurred_at` for `ids.ticketA2`; assert every fixture ticket has `abs(delta) <= interval '1 second'` in `v_ticket_phase_coverage`. Add a cancelled ticket with `status='cancelled'`, `closed_at`, and a `cancelled` event; assert coverage zero. Add a test that inserting two open primary spans fails with unique violation.

- [ ] **Step 2: Run the test and verify it fails**

Run: `pnpm --filter @axia/server exec vitest run test/db/ticket-phase-coverage.test.ts`
Expected: FAIL because `v_ticket_phase_coverage` or `pending_take` does not exist.

- [ ] **Step 3: Add the enum migration**

`0023_pending_take_phase.sql`:
```sql
alter type public.time_span_kind add value if not exists 'pending_take';
```

- [ ] **Step 4: Implement the phase machine**

In `0024_primary_phase_machine.sql`:
- `close_primary_phase(ticket_id, at)` closes open spans whose kind is one of the eight phase kinds.
- `sync_ticket_phase(...)` maps current status: `registered` → `pending_take`, `with_supervisor` → `technician_assignment`, `assigned` → `wait_start`, `in_progress` → `active_work`, `paused` → `pause`, `attended` → `validation`, `under_claim` → `claim`; final statuses close. It closes the previous primary and opens the desired one, resolving subject from `leader_technician`, open supervisor assignment, validation policy or requester.
- `tickets_open_initial_phase()` trigger inserts `supervisor_response` at `new.reported_at` for every new ticket.
- Rewrite `record_event_span` to call `sync_ticket_phase` for normal transitions; keep specific branches for `paused`/`pause_advanced` reasons, `evidence_added` subject split, `validated` with policy `both`, and `duplicate_marked` annotation. `created` does nothing.
- Rewrite `rebuild_ticket_time_spans` to delete system spans, open the initial `supervisor_response` at `reported_at`, replay events and close final tickets at `coalesce(closed_at, now())`.
- Create `v_ticket_phase_coverage` with `total_time`, `phase_time` (only the eight phase kinds) and `delta = total_time - phase_time`.
- Create the unique partial index:
```sql
create unique index time_spans_one_open_phase
on public.time_spans (ticket_id)
where ended_at is null and voided_at is null
  and kind in (
    'supervisor_response', 'pending_take', 'technician_assignment',
    'wait_start', 'active_work', 'pause', 'validation', 'claim'
  );
```
- Rebuild all tickets at the end of the migration.

- [ ] **Step 5: Run the coverage test**

Run: `pnpm --filter @axia/server exec vitest run test/db/ticket-phase-coverage.test.ts`
Expected: PASS.

- [ ] **Step 6: Fix the existing detail test**

Rewrite the cycle-times case in `tickets-read.test.ts` to create a proper event sequence (`created`, `taken`, `assigned_technician`, `started`, `attended`, `validated`) at controlled timestamps and assert `response=60`, `assignment=30`, `active=60`, `validation=30`, `total=180`. Update `migration.test.ts` expected count to the new number of migrations.

- [ ] **Step 7: Run affected DB tests**

Run: `pnpm --filter @axia/server exec vitest run test/db/tickets-read.test.ts test/db/ticket-phase-coverage.test.ts test/db/migration.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/server/db/migrations apps/server/test/db
git commit -m "feat(metrics): fases primarias exclusivas y cobertura completa"
```

---

### Task 2: Capa de métricas por desenlace

**Files:**
- Create: `apps/server/db/migrations/0025_metrics_outcomes.sql`
- Modify: `apps/server/src/metrics/filters.ts`
- Modify: `apps/server/src/metrics/routes.ts`
- Modify: `apps/server/src/metrics/summary-sql.ts`
- Modify: `apps/server/src/metrics/summary.ts`
- Modify: `apps/server/src/metrics/service.ts`
- Modify: `apps/server/src/metrics/people.ts`
- Modify: `apps/server/src/metrics/quality-sql.ts`
- Create: `apps/server/test/db/metrics-outcomes-http.test.ts`

**Interfaces:**
- `MetricsFilters` gains `outcome?: 'open' | 'closed' | 'rejected' | 'cancelled' | 'duplicate'`.
- `visibleTickets(actor, filters, permission, scope?: 'flow' | 'workload' | 'all')`.
- `metricsBase(actor, filters, permission?, scope?)`.
- `MetricsSummary` gains `flowTickets`, `rejected`, `cancelled`, `duplicate`, `avgResolution`, `sumResolution`.

- [ ] **Step 1: Write the failing metrics test**

Create `metrics-outcomes-http.test.ts` with a context from `buildTicketHttpApp()`. Mark one ticket `cancelled` at 5 minutes, one `rejected`, one `duplicate`, and keep one `closed` at 10 hours. Assert:
- `summary.tickets` counts all four; `flowTickets` excludes the three outcomes.
- `summary.closed === 1`, `rejected === 1`, `cancelled === 1`, `duplicate === 1`.
- `summary.avgResolution` is the closed time, not the average of all.
- `GET /api/metrics/sla` does not include rejected/cancelled/duplicate.
- `GET /api/metrics/summary?outcome=cancelled` returns only the cancelled ticket.
- `GET /api/metrics/duplicates-by-dimension` still counts the duplicate.

- [ ] **Step 2: Run the test and verify it fails**

Run: `pnpm --filter @axia/server exec vitest run test/db/metrics-outcomes-http.test.ts`
Expected: FAIL on missing fields/filter.

- [ ] **Step 3: Update views**

`0025_metrics_outcomes.sql`:
- Redefine `v_ticket_metrics_base` without `where status <> 'duplicate'`, appending `case when status in ('closed','rejected','cancelled','duplicate') then status::text else 'open' end as outcome`.
- Redefine `v_ticket_sla` with `where status = 'closed'`.
- Keep the rest of both definitions identical to `0000_base.sql`.

- [ ] **Step 4: Implement filters and scopes**

- `filterParams` adds `p_outcome`.
- `routes.ts` validates `outcome` with a Zod enum.
- `visibleTickets` applies the outcome filter and the scope predicate:
  - `flow`: `status not in ('rejected','cancelled','duplicate')`
  - `workload`: `status <> 'duplicate'`
  - `all`: no status filter
- `metricsBase` passes the scope.
- `service.ts` chooses scope per metric: duplicate and reject/cancel queries `all`; workload/people/pauses/routing `workload`; SLA/satisfaction `flow`.
- `people.ts` uses `workload`.
- `quality-sql.ts` uses `flow`.

- [ ] **Step 5: Add outcome metrics and grouping**

- `summary-sql.ts`: add `outcome` to the grouping sets and dimension cases; add `rejected`, `cancelled`, `duplicate`, `flow_tickets` counts; add `avg_resolution`/`sum_resolution` over `status='closed'`; change `reopenRate` to use `closed` as denominator.
- `summary.ts`: pass `all` scope for groups; map new fields.
- `summary` endpoint keeps `tickets` as total volume.

- [ ] **Step 6: Run the metrics tests**

Run: `pnpm --filter @axia/server exec vitest run test/db/metrics-outcomes-http.test.ts test/db/metrics-http.test.ts test/db/metrics-scope.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/server/db/migrations/0025_metrics_outcomes.sql apps/server/src/metrics apps/server/test/db
git commit -m "feat(metrics): separar desenlaces de los indicadores de flujo"
```

---

### Task 3: Interfaz sin “sin clasificar” y con desenlaces

**Files:**
- Modify: `apps/web/src/features/metrics/domain/visuals.ts`
- Modify: `apps/web/src/features/metrics/domain/visuals.test.ts`
- Modify: `apps/web/src/features/metrics/domain/metrics.ts`
- Modify: `apps/web/src/features/metrics/domain/dimensions.ts`
- Modify: `apps/web/src/features/metrics/dimension-labels.ts`
- Modify: `apps/web/src/features/metrics/i18n.ts`
- Modify: `apps/web/src/features/metrics/api/metrics-api.ts`
- Modify: `apps/web/src/features/metrics/components/cycle-bar.tsx`
- Modify: `apps/web/src/features/metrics/components/phase-table.tsx`
- Modify: `apps/web/src/features/metrics/components/metrics-filter-fields.tsx`
- Modify: `apps/web/src/features/metrics/components/metrics-toolbar.tsx`
- Modify: `apps/web/src/features/metrics/components/summary-tab.tsx`
- Test: `apps/web/src/features/metrics/domain/visuals.test.ts`, `dimensions.test.ts`

**Interfaces:**
- `CyclePhase` no longer includes `unclassified`.
- `cyclePhases(input)` returns eight phase slices; `total` is only used by callers for width.
- `Dimension` includes `outcome`.
- `MetricsSummary` includes the new backend fields.

- [ ] **Step 1: Write failing web tests**

Update `visuals.test.ts` to assert `cyclePhases` has exactly the eight measured phases and no `unclassified`. Add a dimensions test that `rowsByDimension(groups, 'outcome')` returns outcome rows. Add a metrics mapping test that the new summary fields survive the API boundary.

- [ ] **Step 2: Run tests and verify they fail**

Run: `pnpm --filter @axia/web exec vitest run src/features/metrics`
Expected: FAIL on missing `outcome`/fields and the old `unclassified`.

- [ ] **Step 3: Implement the domain changes**

- Remove `unclassified` from `CyclePhase`, `CycleInput` consumers, colors, legend and phase table.
- Add `outcome` to `Dimension`, `DIMENSIONS`, `dimensionLabels` and `rowsByDimension`.
- Add `outcome` to `MetricsFilters`, `EMPTY_FILTERS` and `filtersQuery`.
- Add `flowTickets`, `rejected`, `cancelled`, `duplicate`, `avgResolution`, `sumResolution` to `MetricsSummary` and `EMPTY_SUMMARY`.

- [ ] **Step 4: Implement the UI**

- Add a static “Desenlace” select in the metrics filters with `Todos`, `Abiertos`, `Cerrados`, `Rechazados`, `Cancelados`, `Duplicados`.
- Add “Desenlace” to the dimension picker.
- Add an outcomes card to the summary tab using `rowsByDimension(groups, 'outcome')`, showing count, share and average time.
- Update hints: resolution and SLA are over closed; phase/volume figures follow the outcome filter.
- Remove `kpiHints.unclassified` and its obsolete text.

- [ ] **Step 5: Run web tests and typecheck**

Run: `pnpm --filter @axia/web test:unit && pnpm --filter @axia/web typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/metrics
git commit -m "feat(web): desenlaces y fases sin residuo"
```

---

### Task 4: Documentación y compuerta

**Files:**
- Create: `docs/decisions/0114-fases-exclusivas-y-desenlaces.md`
- Modify: `docs/decisions/README.md`
- Modify: `docs/concepts/negocio.md`
- Modify: `docs/concepts/datos.md`
- Modify: `docs/reference/estados-y-transiciones.md`
- Modify: `docs/reference/api.md`
- Modify: `docs/internal/estado.md`

- [ ] **Step 1: Write the ADR and docs**

Record that rejected/cancelled/duplicate are outcomes, not closures; that the base keeps all tickets and segments by outcome; that performance denominators are explicit; and that phases are exclusive with annotations excluded.

- [ ] **Step 2: Run the full gate**

Run: `AXIA_ENV_FILE=/dev/null pnpm check`
Expected: exit 0. If the database container is unavailable, start it with `pnpm test:db:start` and rerun.

- [ ] **Step 3: Run smoke E2E**

Run: `pnpm test:e2e:smoke`
Expected: PASS, no “Sin clasificar” in the times view.

- [ ] **Step 4: Commit**

```bash
git add docs
git commit -m "docs: fases exclusivas y desenlaces propios"
```

---

## Self-review notes

- Task 1 owns the coverage invariant; Task 2 must not introduce another place that filters phases by status.
- Task 2's `outcome` filter must be applied before aggregation, not only in the frontend.
- Task 3 must keep `total` in `CycleInput` for bar widths even though `unclassified` disappears.
- The duplicate workload exclusion is the only blanket exclusion that remains, and it is required by `negocio.md`.
