# Orden natural de nombres — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que todo listado de nombres ordene los tramos numéricos como números (`Piso 2` antes que `Piso 10`) sin depender de ICU ni cambiar la colación de la base.

**Architecture:** Una función SQL `public.natural_sort_key(text)` transforma cada tramo numérico en un tramo con ceros a la izquierda; los `ORDER BY` de nombres la usan y el resto de la colación actual se conserva. La función se ejecuta con el rol `axia_app` mediante un `GRANT` explícito.

**Tech Stack:** PostgreSQL 17, Drizzle/Fastify, React/Vite, Vitest, Playwright.

**Spec:** Decisión de la conversación del 2026-11-05; se documenta en el ADR 0117.

## Global Constraints

- Migraciones nuevas en `apps/server/db/migrations/`; nunca editar una migración integrada.
- Código, tablas y columnas en inglés; textos de interfaz en español (es-MX).
- Sin RLS: los permisos viven en el servidor y en las consultas con alcance.
- La función es portable: no usa ICU ni extensiones.
- Prioridades y motivos conservan `position` como criterio principal.
- `pnpm check:fast` durante el desarrollo; `pnpm check` antes de integrar.

## Review Focus

- Nombres con varios tramos numéricos (`Torre 2 Piso 10`) deben ordenar por cada tramo.
- Números de distinta longitud y con ceros a la izquierda no deben romper el orden.
- Mayúsculas, acentos y `ñ` deben conservar el comportamiento de la colación actual.
- Las columnas no textuales del admin no deben recibir `COLLATE` ni conversiones que alteren su orden.
- La función debe ser ejecutable por `axia_app`, no solo por el rol dueño.

---

### Task 1: Función SQL portable y permisos

**Files:**
- Create: `apps/server/db/migrations/0028_natural_sort_key.sql`
- Modify: `apps/server/test/db/migration.test.ts`

**Interfaces:**
- Produces: `public.natural_sort_key(value text) returns text`, inmutable y paralela segura.
- Produces: permiso de ejecución para `axia_app`.

- [ ] **Step 1: Write the failing migration tests**

En `migration.test.ts`, cambia el conteo esperado de funciones públicas de 30 a 31 y agrega:

```ts
describe('natural name ordering', () => {
  it('sorts numeric runs as numbers', async () => {
    const result = await owner.query<{ value: string }>(`
      select value
      from (values ('Piso 10'), ('Piso 1'), ('Piso 2'), ('Torre 2 Piso 10'), ('Torre 2 Piso 2')) v(value)
      order by public.natural_sort_key(value)
    `)
    expect(result.rows.map((row) => row.value)).toEqual([
      'Piso 1',
      'Piso 2',
      'Piso 10',
      'Torre 2 Piso 2',
      'Torre 2 Piso 10',
    ])
  })

  it('is executable by the application role', async () => {
    const result = await app.query<{ value: boolean }>(
      "select public.natural_sort_key('Piso 2') < public.natural_sort_key('Piso 10') as value",
    )
    expect(result.rows[0]?.value).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `pnpm --filter @axia/server exec vitest run test/db/migration.test.ts`

Expected: FAIL because `public.natural_sort_key` does not exist and the function count is 30.

- [ ] **Step 3: Create the migration**

```sql
-- Orden natural portable: los tramos numéricos se comparan como números.
create function public.natural_sort_key(value text)
returns text
language sql
immutable
parallel safe
as $$
  select coalesce(
    string_agg(
      case
        when part[1] ~ '^[0-9]+$'
          then lpad(part[1], greatest(20, length(part[1])), '0')
        else part[1]
      end,
      '' order by ordinal
    ),
    ''
  )
  from regexp_matches(coalesce(value, ''), '[0-9]+|[^0-9]+', 'g')
    with ordinality as m(part, ordinal)
$$;

revoke all on function public.natural_sort_key(text) from public;
grant execute on function public.natural_sort_key(text) to axia_app;
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `pnpm --filter @axia/server exec vitest run test/db/migration.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/server/db/migrations/0028_natural_sort_key.sql apps/server/test/db/migration.test.ts
git commit -m "feat(db): add portable natural sort key"
```

### Task 2: Catálogos y tablas del admin

**Files:**
- Modify: `apps/server/src/catalogs/repository.ts`
- Modify: `apps/server/src/catalogs/admin-rows.ts`
- Modify: `apps/server/src/catalogs/admin-row-queries.ts`
- Modify: `apps/server/src/catalogs/admin.ts`
- Modify: `apps/server/test/db/catalogs-http.test.ts`
- Modify: `apps/server/test/db/catalogs-admin-rows.test.ts`

**Interfaces:**
- Consumes: `public.natural_sort_key(text)`.
- Produces: respuestas de catálogo y de admin ordenadas naturalmente por nombre.

- [ ] **Step 1: Write the failing API tests**

En `catalogs-http.test.ts`, agrega una prueba que cree un edificio con ubicaciones `Piso 10`, `Piso 2` y `Piso 1` y espere el orden natural en `/api/catalogs/locations?buildingId=...`.

En `catalogs-admin-rows.test.ts`, agrega una prueba que inserte las mismas ubicaciones y espere el orden natural en `GET /api/admin/catalogs/locations` y `?orderBy=name`.

- [ ] **Step 2: Run the tests and verify they fail**

Run: `pnpm --filter @axia/server exec vitest run test/db/catalogs-http.test.ts test/db/catalogs-admin-rows.test.ts`

Expected: FAIL because the API still returns alphabetical order.

- [ ] **Step 3: Apply the function in SQL**

Cambia cada `order by name`, `order by full_name` y orden agregado de nombres por `public.natural_sort_key(...)`. Mantén `position` como primer criterio en prioridades y motivos. En `admin-rows.ts`, aplica la función solo a columnas textuales conocidas; las demás conservan su orden nativo.

- [ ] **Step 4: Run the tests and verify they pass**

Run: `pnpm --filter @axia/server exec vitest run test/db/catalogs-http.test.ts test/db/catalogs-admin-rows.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/catalogs apps/server/test/db/catalogs-http.test.ts apps/server/test/db/catalogs-admin-rows.test.ts
git commit -m "feat(catalogs): order catalog names naturally"
```

### Task 3: Resto de listados de nombres

**Files:**
- Modify: `apps/server/src/auth/access-admin.ts`
- Modify: `apps/server/src/auth/admin-users.ts`
- Modify: `apps/server/src/auth/authorization.ts`
- Modify: `apps/server/src/catalogs/calendars.ts`
- Modify: `apps/server/src/tickets/supervisors.ts`
- Modify: `apps/server/src/tickets/create-validation.ts`
- Modify: `apps/server/src/metrics/people.ts`
- Modify: `apps/server/src/metrics/quality-sql.ts`

**Interfaces:**
- Consumes: `public.natural_sort_key(text)`.

- [ ] **Step 1: Apply the function to the remaining name orderings**

Sustituye los `order by` de nombres y los desempates por nombre. No cambies los órdenes por fecha, conteo, posición o estado.

- [ ] **Step 2: Run the affected database tests**

Run: `pnpm --filter @axia/server test:db`

Expected: PASS; si alguna prueba falla por el nuevo orden, ajusta la expectativa al orden natural y documenta el cambio en el commit.

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/auth apps/server/src/catalogs/calendars.ts apps/server/src/tickets apps/server/src/metrics
git commit -m "feat(server): apply natural order to remaining name lists"
```

### Task 4: Documentación y verificación final

**Files:**
- Create: `docs/decisions/0117-orden-natural-portable.md`
- Modify: `docs/decisions/README.md`
- Modify: `docs/reference/convenciones-codigo.md`
- Modify: `docs/internal/estado.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Write the ADR and convention**

Documenta la elección de `natural_sort_key` frente a ICU, sus consecuencias (sin uso de índices para ordenar; catálogos pequeños) y la regla para listados nuevos.

- [ ] **Step 2: Update status and changelog**

Registra la tarea, la evidencia y el siguiente paso.

- [ ] **Step 3: Run the full gate**

Run: `pnpm check`

Expected: exit code 0.

- [ ] **Step 4: Run the UI smoke**

Run: `pnpm test:e2e:smoke`

Expected: todos los casos en verde.

- [ ] **Step 5: Commit**

```bash
git add docs CHANGELOG.md
git commit -m "docs: document natural name ordering"
```
