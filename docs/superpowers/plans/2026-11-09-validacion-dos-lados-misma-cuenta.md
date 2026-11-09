# Validación de ambos lados por una misma cuenta — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que una cuenta que es solicitante y supervisora del mismo tiquet registre los dos lados de la validación en dos pasos explícitos, respetando la política de la instancia.

**Architecture:** El servidor decide el lado por un `role` explícito en la acción `validate` y autoriza cada lado por separado; el detalle expone capacidades y el estado de cada lado. La web muestra dos acciones de un clic y la proyección offline entiende los dos pasos. Sin migración.

**Tech Stack:** Fastify 5, Drizzle, PostgreSQL 17, Zod, React, TanStack Query, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-09-validacion-dos-lados-misma-cuenta-design.md`

## Global Constraints

- Código, SQL y nombres en inglés; textos de interfaz en español es-MX.
- No editar migraciones integradas; este cambio no requiere migración.
- Toda acción valida permiso, estado e idempotencia en el servidor; la interfaz no es autoridad.
- Cada archivo ≤300 líneas, función ≤60, componente ≤150; complejidad ciclomática ≤10.
- No añadir dependencias.
- No debilitar pruebas ni reglas para pasar.
- Actualizar documentación en el mismo commit que el comportamiento.

## Review Focus

- Un cliente viejo (o una acción offline ya encolada) sin `role` debe seguir funcionando con la derivación anterior; si se rompe, se pierden validaciones pendientes.
- Una cuenta solo solicitante que pide el lado del supervisor debe recibir 403, no registrar un lado inútil.
- En `both`, el lado del supervisor antes del solicitante debe dar 409 y no cambiar el estado.
- Repetir el mismo lado debe dar 409; repetir la misma petición (mismo `clientRequestId`) debe ser idempotente.
- Dos validaciones de la misma cuenta deben dejar dos eventos y dos tramos distintos, no uno duplicado.

---

### Task 1: Servidor — resolver y autorizar el lado de validación

**Files:**
- Modify: `apps/server/src/tickets/schemas.ts:113-117`
- Modify: `apps/server/src/tickets/actions.ts:259-265`
- Modify: `apps/server/src/tickets/validation.ts:79-115` y `:160-237`
- Create: `apps/server/test/db/tickets-validation-sides-http.test.ts`

**Interfaces:**
- Consumes: `assertTicketAction`, `findVisibleTicket`, `can`, `getPermissionScope`, `assertRequesterProxy`, `recordValidation`, `shouldClose`.
- Produces:
  - `type ValidationRole = 'requester' | 'supervisor'`
  - `validateTicket(db, actor, input: { ticketId: string; clientRequestId: string; subjectRequesterId?: string | null; role?: ValidationRole | null })`
  - `validationCapabilities(actor: Actor, access: TicketAccess, policy: 'requester' | 'supervisor' | 'both'): { canValidateRequester: boolean; canValidateSupervisor: boolean }`

- [ ] **Step 1: Escribir la prueba de integración que falla**

Crear `apps/server/test/db/tickets-validation-sides-http.test.ts` con helpers propios:

```ts
import { randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { authHeaders, buildTicketHttpApp, closeTicketHttpApp, type TicketHttpContext } from './tickets-http-helpers.js'
import { loadWriteRefs, type WriteRefs } from './tickets-write-helpers.js'
import { cookieFrom, login } from './auth-helpers.js'

const PASSWORD = 'TicketPassword123!'
let context: TicketHttpContext
let refs: WriteRefs

// Helpers: createAccount({ roles, requester, technician, supervisorTeamId,
// buildingId }), loginCookie, createTicket(cookie, requesterId), action,
// attendTicket(cookie, ticketId, technicianId), setPolicy(policy).
```

Casos obligatorios (nombres en español):

```ts
it('la misma cuenta valida los dos lados en política both y cierra', async () => {
  // cuenta con roles requester, supervisor, technician; scope team A/building A1;
  // ticket propio, toma, asignación a su técnico, evidencias before/after, start, attend.
  // role=requester -> 200; role=supervisor -> 200; status => 'closed'.
})

it('repetir un lado responde 409 y no cambia el estado', async () => {
  // dos role=requester: 200 y 409; status => 'attended'.
})

it('el lado del supervisor antes del solicitante responde 409', async () => {
  // role=supervisor primero: 409; status => 'attended'.
})

it('la política supervisor registra solo el lado del supervisor', async () => {
  // setPolicy('supervisor'); role=supervisor -> 200 y closed;
  // no existe fila validator_role='requester'.
})

it('la política requester rechaza el lado del supervisor', async () => {
  // setPolicy('requester'); role=supervisor -> 403; role=requester -> 200 y closed.
})

it('una cuenta solo solicitante no puede validar el lado del supervisor', async () => {
  // role=supervisor -> 403; no cambia el estado.
})

it('una cuenta solo supervisora valida el solicitante a nombre del solicitante', async () => {
  // role=requester + subjectRequesterId -> 200; role=supervisor -> 200 y closed.
})

it('la misma cuenta deja dos eventos y dos sujetos distintos', async () => {
  // consultar public.ticket_events: dos validated con payload.role distinto;
  // el de requester tiene subject_requester_id; el de supervisor subject_user_id.
})

it('repetir la misma petición es idempotente', async () => {
  // mismo clientRequestId y role -> replayed true y un solo evento.
})
```

- [ ] **Step 2: Ejecutar y ver el fallo**

Run: `pnpm --filter @axia/server exec vitest run test/db/tickets-validation-sides-http.test.ts`
Expected: FAIL porque `role` no existe en el esquema y el segundo `validate` responde 409.

- [ ] **Step 3: Implementar el contrato y la resolución del lado**

En `schemas.ts`, el objeto `validate` suma:

```ts
role: z.enum(['requester', 'supervisor']).optional(),
```

En `actions.ts`, pasar `role: input.role` a `validateTicket`.

En `validation.ts`, reemplazar `validationRole` por:

```ts
type ValidationRole = 'requester' | 'supervisor'

function isRequesterIdentity(actor: Actor, ticket: LockedValidationTicket): boolean {
  return false // implementar: comparar requesters.user_id con actor.id (ya existe requesterUserId)
}

function isSupervisorSide(actor: Actor, access: TicketAccess): boolean {
  // getPermissionScope(actor, 'ticket.validate') !== 'own' || access.isSupervisor
}

async function resolveValidationRole(input: {
  tx: DbExecutor
  actor: Actor
  access: TicketAccess
  ticket: LockedValidationTicket
  policy: 'requester' | 'supervisor' | 'both'
  onBehalf: boolean
  requested?: ValidationRole | null
}): Promise<ValidationRole>
```

Reglas exactas:
- `onBehalf` o `requested === 'requester'` → `requester`; exige que el actor sea el solicitante o `onBehalf`, si no 403 `'Solo el solicitante puede validar su lado'`.
- `requested === 'supervisor'` → `supervisor`; exige `isSupervisorSide`, si no 403 `'Solo un supervisor puede validar este lado'`.
- Sin `requested`: `policy === 'requester'` → `requester`; `policy === 'supervisor'` → `supervisor`; `policy === 'both'` → `requester` si el actor es el solicitante y falta su lado, si no `supervisor`.
- `policy === 'supervisor'` con `requested === 'requester'` → 403 `'Esta instancia valida solo por el supervisor'`.
- `policy === 'requester'` con `requested === 'supervisor'` → 403 `'Esta instancia valida solo por el solicitante'`.
- `policy === 'both'` y `role === 'supervisor'` sin validación del solicitante → 409 `'Falta la validación del solicitante'`.
- `subjectRequesterId` con `requested === 'supervisor'` → 400 `'Un sujeto solicitante no puede validar el lado del supervisor'`.

`validateInTransaction` calcula `policy`, `onBehalf` y `role` en ese orden; el resto (registro, cierre y evento) no cambia.

- [ ] **Step 4: Ejecutar la prueba y corregir hasta verde**

Run: `pnpm --filter @axia/server exec vitest run test/db/tickets-validation-sides-http.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/tickets/schemas.ts apps/server/src/tickets/actions.ts apps/server/src/tickets/validation.ts apps/server/test/db/tickets-validation-sides-http.test.ts
git commit -m "feat(tiquets): permitir validar ambos lados desde la misma cuenta"
```

---

### Task 2: Servidor — detalle con estado y capacidades de validación

**Files:**
- Modify: `apps/server/src/tickets/detail.ts:52-62`, `:106-118`, `:160-172`, `:185-200`
- Modify: `apps/server/src/tickets/validation.ts` (exportar `validationCapabilities`)
- Test: `apps/server/test/db/tickets-validation-sides-http.test.ts`

**Interfaces:**
- Consumes: `validationCapabilities` de Task 1; `can`, `getPermissionScope`.
- Produces: `TicketDetail` con `supervisorValidated`, `canValidateRequester`, `canValidateSupervisor`.

- [ ] **Step 1: Añadir las aserciones de detalle a la prueba**

```ts
it('el detalle expone el estado de cada lado y las capacidades', async () => {
  // ticket attended con la cuenta de ambos papeles:
  // GET -> supervisorValidated=false, canValidateRequester=true, canValidateSupervisor=true.
  // tras role=requester -> requesterValidated=true, supervisorValidated=false,
  //   canValidateSupervisor=true.
  // tras role=supervisor -> supervisorValidated=true, status='closed'.
})

it('una cuenta solo solicitante no recibe la capacidad del supervisor', async () => {
  // GET -> canValidateRequester=true, canValidateSupervisor=false.
})
```

- [ ] **Step 2: Ejecutar y ver el fallo**

Run: `pnpm --filter @axia/server exec vitest run test/db/tickets-validation-sides-http.test.ts`
Expected: FAIL por propiedades `undefined`.

- [ ] **Step 3: Implementar el detalle**

En `validation.ts`, exportar:

```ts
export function validationCapabilities(
  actor: Actor,
  access: TicketAccess,
  policy: 'requester' | 'supervisor' | 'both',
): { canValidateRequester: boolean; canValidateSupervisor: boolean } {
  // requester: policy !== 'supervisor' && can(actor,'ticket.validate',access) &&
  //   (access.requesterUserId === actor.id || can(actor,'ticket.validate_on_behalf',access))
  // supervisor: policy !== 'requester' && can(actor,'ticket.validate',access) &&
  //   (access.isSupervisor || getPermissionScope(actor,'ticket.validate') !== 'own')
}
```

En `detail.ts`:
- Agregar `supervisor_validated` a `TicketDetail`/`DetailRow`.
- En `detailQuery`, `exists (... validator_role = 'supervisor') as supervisor_validated`.
- En `getTicketDetail`, después de la fila: `const capabilities = validationCapabilities(actor, access, row.validation_policy)` y pasarlas a `toDetail`.
- `toDetail` devuelve `supervisorValidated`, `canValidateRequester`, `canValidateSupervisor`.

- [ ] **Step 4: Ejecutar la prueba y corregir hasta verde**

Run: `pnpm --filter @axia/server exec vitest run test/db/tickets-validation-sides-http.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/tickets/detail.ts apps/server/src/tickets/validation.ts apps/server/test/db/tickets-validation-sides-http.test.ts
git commit -m "feat(tiquets): exponer estado y capacidades de validación en el detalle"
```

---

### Task 3: Web — contrato, tipos y acciones de dominio

**Files:**
- Modify: `apps/web/src/features/tickets/domain/types.ts:116-121`
- Modify: `apps/web/src/features/tickets/domain/actions.ts:5-24`, `:79-90`, `:92-122`, `:142-149`, `:173-209`, `:227-239`, `:241-260`
- Modify: `apps/web/src/features/tickets/domain/action-emphasis.ts:16-38`
- Modify: `apps/web/src/features/tickets/i18n.ts:195-215`
- Modify: `apps/web/src/features/tickets/domain/action-validation.ts` (si `REQUIRED` usa `ActionKey`, no hace falta entrada)
- Test: `apps/web/src/features/tickets/domain/actions.test.ts`

**Interfaces:**
- Consumes: `TicketDetail` con los campos de Task 2.
- Produces:
  - `ActionKey` incluye `validate_requester` y `validate_supervisor`; desaparece `validate`.
  - `ActionContext` incluye `supervisorValidated: boolean`, `canValidateRequester: boolean`, `canValidateSupervisor: boolean`, `validationPolicy: 'requester' | 'supervisor' | 'both'`.

- [ ] **Step 1: Escribir las pruebas de dominio que fallan**

En `actions.test.ts`, ampliar `context()` con los campos nuevos y agregar:

```ts
it('muestra los dos lados cuando la cuenta puede validar ambos', () => {
  const actions = allowedActions(context([], 'attended', {
    isRequester: true,
    canValidateRequester: true,
    canValidateSupervisor: true,
    validationPolicy: 'both',
  }))
  expect(actions).toContain('validate_requester')
  expect(actions).toContain('validate_supervisor')
})

it('tras validar el solicitante conserva el lado del supervisor', () => {
  const actions = allowedActions(context([], 'attended', {
    isRequester: true,
    requesterValidated: true,
    canValidateRequester: true,
    canValidateSupervisor: true,
    validationPolicy: 'both',
  }))
  expect(actions).toEqual(['validate_supervisor'])
})

it('no muestra el lado del supervisor antes del solicitante', () => {
  const actions = allowedActions(context([], 'attended', {
    canValidateSupervisor: true,
    validationPolicy: 'both',
  }))
  expect(actions).not.toContain('validate_supervisor')
})

it('respeta la política supervisor y la requester', () => {
  expect(allowedActions(context([], 'attended', {
    canValidateSupervisor: true,
    validationPolicy: 'supervisor',
  }))).toContain('validate_supervisor')
  expect(allowedActions(context([], 'attended', {
    canValidateRequester: true,
    validationPolicy: 'requester',
  }))).toContain('validate_requester')
})
```

Actualizar `action-validation.test.ts` para usar `validate_requester` en lugar de `validate`.

- [ ] **Step 2: Ejecutar y ver el fallo**

Run: `pnpm --filter @axia/web exec vitest run src/features/tickets/domain/actions.test.ts src/features/tickets/domain/action-validation.test.ts`
Expected: FAIL por tipo/acciones desconocidas.

- [ ] **Step 3: Implementar tipos y reglas**

- `TicketDetail` suma `supervisorValidated: boolean`, `canValidateRequester: boolean`, `canValidateSupervisor: boolean`.
- `ActionKey`: reemplazar `'validate'` por `'validate_requester' | 'validate_supervisor'`.
- `checks`:
  ```ts
  validate_requester: (c) =>
    c.status === 'attended' && c.canValidateRequester && !c.requesterValidated,
  validate_supervisor: (c) =>
    c.status === 'attended' && c.canValidateSupervisor && !c.supervisorValidated &&
    (c.validationPolicy !== 'both' || c.requesterValidated),
  ```
- `allowedActions`, rama `isRequester && requesterValidated` en `attended`/`under_claim`:
  ```ts
  return actions.filter((action) => action === 'validate_supervisor')
  ```
  En el resto de estados, filtrar `validate_requester` y `open_claim` como hoy.
- `PRIMARY_ORDER`: `'validate_requester'`, `'validate_supervisor'` antes de `resolve_claim`.
- `action-emphasis`: ambos `'success'`.
- `ticketMessages.actions`: `validate_requester: 'Validar como solicitante'`, `validate_supervisor: 'Validar como supervisor'`; quitar `validate`.
- `REQUESTER_PROXY_ACTIONS`: `validate_requester` en lugar de `validate`.

- [ ] **Step 4: Ejecutar y corregir hasta verde**

Run: `pnpm --filter @axia/web exec vitest run src/features/tickets/domain/actions.test.ts src/features/tickets/domain/action-validation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/tickets/domain apps/web/src/features/tickets/i18n.ts
git commit -m "feat(web): separar las acciones de validación por lado"
```

---

### Task 4: Web — cableado de botones, comandos y proyección offline

**Files:**
- Modify: `apps/web/src/features/tickets/api/ticket-commands.ts:66-69`
- Modify: `apps/web/src/features/tickets/hooks/use-action-panel.ts:16`, `:44-55`, `:57-61`, `:88-103`
- Modify: `apps/web/src/features/tickets/components/ticket-detail.tsx:76-89`
- Modify: `apps/web/src/features/tickets/domain/pending-actions.ts:45-55`, `:96-116`, `:186-220`
- Test: `apps/web/src/features/tickets/domain/pending-actions.test.ts`

**Interfaces:**
- Consumes: `ActionKey`, `TicketDetail` y `validateTicket` de las tareas anteriores.
- Produces: comando `{ operation: 'validate', args: { role?: 'requester' | 'supervisor', subjectRequesterId?: string } }`; proyección con `supervisorValidated`.

- [ ] **Step 1: Escribir las pruebas de proyección que fallan**

En `pending-actions.test.ts`:
- Agregar `supervisorValidated: false` y las capacidades al fixture `ticket()`.
- Nuevos casos:

```ts
it('proyecta los dos pasos de la misma cuenta en política both', () => {
  const requester = projectPendingTicket(
    ticket({ status: 'attended', validationPolicy: 'both' }),
    [action('validate', 1, { role: 'requester' })],
  )
  expect(requester.ticket.requesterValidated).toBe(true)
  expect(requester.ticket.status).toBe('attended')

  const supervisor = projectPendingTicket(requester.ticket, [
    action('validate', 2, { role: 'supervisor' }),
  ])
  expect(supervisor.ticket.supervisorValidated).toBe(true)
  expect(supervisor.ticket.status).toBe('closed')
})

it('en política supervisor el primer paso cierra', () => {
  const result = projectPendingTicket(
    ticket({ status: 'attended', validationPolicy: 'supervisor' }),
    [action('validate', 1, { role: 'supervisor' })],
  )
  expect(result.ticket.supervisorValidated).toBe(true)
  expect(result.ticket.status).toBe('closed')
})

it('sin role conserva la derivación anterior', () => {
  const result = projectPendingTicket(
    ticket({ status: 'attended', validationPolicy: 'both' }),
    [action('validate', 1, { subjectRequesterId: 'requester-1' })],
  )
  expect(result.ticket.requesterValidated).toBe(true)
})
```

- [ ] **Step 2: Ejecutar y ver el fallo**

Run: `pnpm --filter @axia/web exec vitest run src/features/tickets/domain/pending-actions.test.ts`
Expected: FAIL por `role`/`supervisorValidated`.

- [ ] **Step 3: Implementar el cableado**

- `ticket-commands.ts`: `validate` args suma `role: z.enum(['requester','supervisor']).optional()`.
- `use-action-panel.ts`:
  - `ONE_CLICK = ['validate_requester', 'validate_supervisor']`.
  - `oneClick.validate_requester = () => mutations.validate.mutate({ role: 'requester' }, { onSuccess: () => onValidated?.() })`
  - `oneClick.validate_supervisor = () => mutations.validate.mutate({ role: 'supervisor' })`
  - `pending` para ambas usa `mutations.validate.isPending`.
  - `isVisibleFor`: subject requester → solo acciones de `isRequesterProxyAction`; `validate_requester` está en esa lista; `validate_supervisor` no.
  - `validateBlockFor`: mostrar `waiting` si `validationPolicy === 'both' && !requesterValidated && canValidateSupervisor && !canValidateRequester`; `requester_only` si `validationPolicy === 'requester' && !canValidateRequester`. Eliminar `proxyValidateDone` y ocultar `validate_requester` cuando `subject.kind === 'requester' && ticket.requesterValidated`.
- `ticket-detail.tsx`: pasar al `ActionContext` `supervisorValidated`, `canValidateRequester`, `canValidateSupervisor` y `validationPolicy` desde `projection.ticket`.
- `pending-actions.ts`:
  - `ProjectionState` suma `supervisorValidated`.
  - `validateTransition` lee `action.args.role`; si es `'requester'` o `'supervisor'`, usa ese lado; si falta, conserva la derivación actual (`isRequester || subjectRequesterId`).
  - Lado solicitante: si ya validó → `stop`; marca `requesterValidated`; cierra si la política es `requester`.
  - Lado supervisor: si la política es `requester` → `stop`; si es `both` y falta el solicitante → `stop`; si ya validó → `stop`; marca `supervisorValidated` y cierra.
  - Inicializar desde `ticket.supervisorValidated` y devolverlo en el tiquet proyectado.
  - `projectPendingStatus` usa `supervisorValidated: false`.

- [ ] **Step 4: Ejecutar las pruebas y el typecheck**

Run: `pnpm --filter @axia/web exec vitest run src/features/tickets/domain/pending-actions.test.ts src/features/tickets/domain/actions.test.ts`
Run: `pnpm --filter @axia/web typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/tickets
git commit -m "feat(web): validar ambos lados en dos pasos y proyectarlo offline"
```

---

### Task 5: Documentación, ADR y verificación final

**Files:**
- Create: `docs/decisions/0123-validacion-dos-lados-misma-cuenta.md`
- Modify: `docs/concepts/negocio.md` (RN-15)
- Modify: `docs/reference/estados-y-transiciones.md:45`
- Modify: `docs/reference/permisos.md` (sección de validación)
- Modify: `docs/reference/api.md` (acción `validate`)
- Modify: `docs/internal/estado.md`

**Interfaces:**
- Consumes: comportamiento implementado en Tasks 1–4.
- Produces: documentación y ADR que describen los dos pasos y la autorización por lado.

- [ ] **Step 1: Escribir el ADR**

`0123-validacion-dos-lados-misma-cuenta.md` con contexto, alternativas (un clic vs dos pasos), decisión, consecuencias y reversión. Mencionar que el lado del supervisor sigue sujeto al ámbito y que la sombra de ámbito queda fuera.

- [ ] **Step 2: Actualizar la especificación y las referencias**

- RN-15: una cuenta con ambos papeles valida en dos pasos; en `both`, primero solicitante; cada paso registra su rol, evento y tramo.
- `estados-y-transiciones.md`: `validate` acepta `role`; sin `role` se deriva.
- `permisos.md`: lado del solicitante (identidad o proxy) y lado del supervisor (ámbito no `own` o titularidad).
- `api.md`: campo `role` opcional.
- `estado.md`: tarea integrada y evidencia.

- [ ] **Step 3: Ejecutar la compuerta completa**

Run: `pnpm check:fast`
Run: `pnpm test:affected`
Run: `pnpm check`
Expected: código 0; anotar el número de pruebas y cualquier aviso preexistente.

- [ ] **Step 4: Commit**

```bash
git add docs
git commit -m "docs(tiquets): documentar la validación en dos pasos"
```

---

## Self-Review

- Cobertura del spec: resolución por `role`, autorización por lado, políticas, detalle, UI, offline, pruebas y documentación tienen tarea.
- Los nombres `validate_requester`/`validate_supervisor`, `supervisorValidated`, `canValidateRequester` y `canValidateSupervisor` se usan igual en todas las tareas.
- La derivación sin `role` se prueba en servidor (Task 1) y en proyección (Task 4).
- Los casos de revisión (cliente viejo, cuenta solo solicitante, orden de `both`, repetición, dos eventos) tienen prueba en las tareas que tocan el código.
- Fuera de alcance: sombra de ámbito, titularidad y reclamación; el plan no las modifica.
