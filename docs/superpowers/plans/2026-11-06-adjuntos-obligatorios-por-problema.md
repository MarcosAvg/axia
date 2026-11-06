# Adjuntos obligatorios por problema — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que ciertos problemas exijan un adjunto configurable al crear el tiquet, guardado aparte de la evidencia y verificado por el servidor.

**Architecture:** subida TUS a un área de preparación, vínculo atómico en la transacción de alta/recaptura y lista segura de tipos verificada con `file-type`. Tabla `ticket_attachments` separada de `evidence`; configuración en `problems`.

**Tech Stack:** PostgreSQL 17, Drizzle, Fastify 5, TUS, `file-type`, React, TanStack Query, React Hook Form + Zod, shadcn/ui.

**Spec:** `docs/superpowers/specs/2026-11-06-adjuntos-obligatorios-por-problema-design.md`

## Global Constraints

- pnpm; Node 24; código/tablas/columnas en inglés, interfaz y documentación en español es-MX.
- Migraciones nuevas, nunca editar las integradas; las tablas nuevas llevan `grant select, insert, update` a `axia_app` y no `delete`.
- Sin RLS; autorización en servidor y alcance en toda consulta de tiquets.
- Fechas `timestamptz`; límites de archivo 300 líneas, función 60, componente 150.
- Tipos permitidos: PDF, JPEG, PNG, WebP, DOCX y XLSX.
- `file-type` es la única dependencia nueva (MIT, repo oficial, 22.x).
- La evidencia no se toca: ningún cambio en `evidence`, `before`/`after`/`claim` ni sus conteos.

## Review Focus

- Un archivo con MIME declarado permitido pero contenido distinto (HTML renombrado, ZIP que no es
  OOXML) no debe quedar `ready` ni ligarse.
- Un adjunto de otra persona o ya ligado no debe poder ligarse, ni por alta ni por recaptura.
- Un fallo de red después de subir no debe perder la preparación ni duplicar el vínculo al
  reintentar el alta.
- Un tiquet derivado de una reclamación no debe bloquear la resolución.
- Un problema sin regla no debe aceptar adjuntos ni mostrarlos como obligatorios.

---

### Task 1: Fundación de datos, configuración y tipos

**Files:**
- Create: `apps/server/src/attachments/types.ts`
- Create: `apps/server/src/attachments/types.test.ts`
- Modify: `apps/server/src/config.ts`
- Create: `apps/server/db/migrations/0029_ticket_attachments.sql`
- Create: `apps/server/db/migrations/0030_attachment_event.sql`
- Modify: `apps/server/package.json`
- Modify: `.env.dev.example`, `.env.dev`, `compose.yaml`, `docs/reference/configuracion.md`

**Interfaces:**
- Produces:
  - `ATTACHMENT_MIME_TYPES: readonly AttachmentMimeType[]`
  - `type AttachmentMimeType = 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'`
  - `isAttachmentMimeType(value: string): value is AttachmentMimeType`
  - `attachmentExtension(mime: AttachmentMimeType): string`
  - Config: `ATTACHMENT_MAX_BYTES`, `ATTACHMENT_QUOTA_BYTES`, `ATTACHMENT_CLEANUP_HOURS`.

- [ ] **Step 1: Escribir las pruebas de tipos**

`apps/server/src/attachments/types.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  ATTACHMENT_MIME_TYPES,
  attachmentExtension,
  isAttachmentMimeType,
} from './types.js'

describe('tipos de adjunto', () => {
  it('reconoce solo los MIME permitidos', () => {
    expect(isAttachmentMimeType('application/pdf')).toBe(true)
    expect(isAttachmentMimeType('text/html')).toBe(false)
    expect(isAttachmentMimeType('image/svg+xml')).toBe(false)
  })

  it('devuelve una extensión segura por tipo', () => {
    expect(attachmentExtension('application/pdf')).toBe('pdf')
    expect(
      attachmentExtension(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ),
    ).toBe('docx')
    expect(ATTACHMENT_MIME_TYPES).toHaveLength(6)
  })
})
```

- [ ] **Step 2: Ejecutar la prueba y verificar que falla**

Run: `pnpm --filter @axia/server exec vitest run src/attachments/types.test.ts`
Expected: FAIL porque el módulo no existe.

- [ ] **Step 3: Crear `types.ts` y ampliar `config.ts`**

Lista cerrada, mapa de extensiones e `isAttachmentMimeType`. En `config.ts` agregar las tres
variables con los valores del diseño (`25 MiB`, `500 MiB`, `24`). Añadir `file-type` a
`apps/server/package.json` (`pnpm --filter @axia/server add file-type`).

- [ ] **Step 4: Crear las migraciones**

`0029_ticket_attachments.sql`: tabla, índice, columnas de `problems` con la restricción de la
lista segura y `grant select, insert, update`. `0030_attachment_event.sql`:
`alter type public.event_type add value 'attachment_added';`.

- [ ] **Step 5: Ejecutar pruebas y migración limpia**

Run: `pnpm --filter @axia/server exec vitest run src/attachments/types.test.ts`
Expected: PASS.
Run: `pnpm --filter @axia/server exec vitest run test/db/migration-integrity.test.ts`
Expected: PASS (requiere PostgreSQL de pruebas).

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/attachments apps/server/src/config.ts apps/server/db/migrations apps/server/package.json pnpm-lock.yaml .env.dev.example .env.dev compose.yaml docs/reference/configuracion.md
git commit -m "feat: prepara datos y configuración de adjuntos"
```

---

### Task 2: Reserva de adjunto y servicio base

**Files:**
- Create: `apps/server/src/attachments/schemas.ts`
- Create: `apps/server/src/attachments/access.ts`
- Create: `apps/server/src/attachments/create.ts`
- Create: `apps/server/src/attachments/service.ts`
- Create: `apps/server/src/attachments/routes.ts`
- Modify: `apps/server/src/app.ts`, `apps/server/src/server.ts`
- Modify: `apps/server/test/db/tickets-http-helpers.ts`
- Create: `apps/server/test/db/attachments-http.test.ts`

**Interfaces:**
- Consumes: `AttachmentMimeType`, `isAttachmentMimeType`; `AppConfig`; `findVisibleTicket`.
- Produces:
  - `createAttachmentSchema`: `{ clientRequestId, problemId, ticketId?, fileName, declaredMimeType, sizeBytes }`
  - `createAttachmentService(db, config)` with `create(actor, input)`, `findForTus(id)`,
    `quotaForUploader(actorId, excludeId)`, `complete(id, data)`, `markFailed(id, message)`.
  - `AttachmentReservation = { attachmentId, uploadUrl, maxSize, quotaRemaining, replayed }`
  - `POST /api/attachments`.

- [ ] **Step 1: Escribir pruebas RED de reserva**

En `attachments-http.test.ts`, con el contexto de `tickets-http-helpers`:
- problema sin regla → `422`;
- problema con regla y MIME permitido → `201`, fila `pending` y sin `ticket_id`;
- MIME no permitido (`text/html`) → `422`;
- misma `clientRequestId` → `200` replay, sin segunda fila;
- sin `ticket.create` → `403`;
- con `ticketId` sin `ticket.recapture` → `403`.

- [ ] **Step 2: Ejecutar y verificar fallo**

Run: `pnpm --filter @axia/server exec vitest run test/db/attachments-http.test.ts`
Expected: FAIL (`404` o módulo inexistente).

- [ ] **Step 3: Implementar esquema, autorización y reserva**

`access.ts` decide entre alta (`ticket.create`/`ticket.create_on_behalf`) y recaptura
(`ticket.recapture` + `findVisibleTicket`). `create.ts` valida que el problema exista, esté activo
y exija alguno de los tipos declarados; aplica cuota y crea la fila con `ticket_id` nulo. El
servicio expone lo necesario para TUS y el vínculo.

- [ ] **Step 4: Registrar rutas**

`app.ts` recibe `attachments?: AttachmentService`; `server.ts` lo crea con
`createAttachmentService(db, config)`. `tickets-http-helpers.ts` lo crea para las pruebas.

- [ ] **Step 5: Verificar GREEN**

Run: `pnpm --filter @axia/server exec vitest run test/db/attachments-http.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/attachments apps/server/src/app.ts apps/server/src/server.ts apps/server/test/db/tickets-http-helpers.ts apps/server/test/db/attachments-http.test.ts
git commit -m "feat: reserva adjuntos con tipos por problema"
```

---

### Task 3: TUS, verificación de contenido, almacenamiento y limpieza

**Files:**
- Create: `apps/server/src/attachments/tus.ts`
- Create: `apps/server/src/attachments/process.ts`
- Create: `apps/server/src/attachments/cleanup.ts`
- Create: `apps/server/src/attachments/cleanup-cli.ts`
- Modify: `apps/server/src/attachments/service.ts`
- Modify: `apps/server/package.json` (`db:cleanup-attachments`)
- Modify: `apps/server/test/db/attachments-http.test.ts`
- Create: `apps/server/test/db/attachments-cleanup.test.ts`

**Interfaces:**
- Consumes: `file-type` (`fileTypeFromBuffer`); `evidence/paths.ts` (`storagePaths`, `resolveStored`).
- Produces:
  - TUS en `/api/attachment-uploads`, metadatos `{ attachmentId }`.
  - `processAttachment(service, config, attachmentId): Promise<void>`.
  - `cleanupPendingAttachments(db, paths, olderThanHours): Promise<{ rows: number }>`.
  - `findForTus`, `quotaForUploader`, `complete`, `markFailed` implementados.

- [ ] **Step 1: Escribir pruebas RED de TUS y contenido**

En `attachments-http.test.ts`:
- un PDF real (`%PDF-1.4...`) se sube por TUS y queda `ready` con `storage_path` y SHA-256;
- un HTML renombrado a `.pdf` queda `failed` y no deja archivo;
- un DOCX/XLSX mínimo válido queda `ready`;
- un ZIP cualquiera queda `failed`;
- no se puede subir a la fila de otra persona;
- una fila ligada no se puede volver a subir.

En `attachments-cleanup.test.ts`: una fila `pending` y otra `ready` sin ligar, antiguas, se marcan
`failed` y se borran sus archivos; una ligada no se toca.

- [ ] **Step 2: Ejecutar y verificar fallo**

Run: `pnpm --filter @axia/server exec vitest run test/db/attachments-http.test.ts test/db/attachments-cleanup.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar TUS separado y procesamiento**

Servidor TUS propio en `/api/attachment-uploads` con `FileStore` sobre
`uploads/attachments/`, autenticación por cookie, verificación de propiedad y límites. Al terminar,
`processAttachment` detecta el tipo real con `fileTypeFromBuffer`, exige que esté en la lista y
que coincida con `declared_mime_type`, escribe `files/attachments/<id>.<ext>` y marca `ready`.

- [ ] **Step 4: Implementar limpieza**

CLI nuevo y script `db:cleanup-attachments`. Marca `failed` y borra archivos de filas sin ligar
más antiguas que `ATTACHMENT_CLEANUP_HOURS`.

- [ ] **Step 5: Verificar GREEN**

Run: `pnpm --filter @axia/server exec vitest run test/db/attachments-http.test.ts test/db/attachments-cleanup.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/attachments apps/server/package.json apps/server/test/db/attachments-http.test.ts apps/server/test/db/attachments-cleanup.test.ts
git commit -m "feat: sube y verifica adjuntos por TUS"
```

---

### Task 4: Alta con vínculo atómico y evento

**Files:**
- Create: `apps/server/src/attachments/link.ts`
- Create: `apps/server/src/attachments/requirements.ts`
- Modify: `apps/server/src/tickets/schemas.ts`
- Modify: `apps/server/src/tickets/create-types.ts`
- Modify: `apps/server/src/tickets/create.ts`
- Modify: `apps/server/test/db/attachments-http.test.ts`
- Modify: `apps/server/test/db/tickets-create-http.test.ts`

**Interfaces:**
- Produces:
  - `problemAttachmentTypes(tx, problemId): Promise<AttachmentMimeType[]>`
  - `linkAttachment(tx, actor, ticketId, attachmentId, allowed): Promise<{ fileName, mimeType }>`
  - `findSatisfyingAttachment(tx, ticketId, allowed): Promise<boolean>`
  - `createTicketSchema` acepta `attachmentId?: string`.
  - `CreateTicketInput.attachmentId?: string`.

- [ ] **Step 1: Escribir pruebas RED de alta**

- problema con regla y sin adjunto → `422`;
- adjunto de otro usuario → `404`/`422`;
- tipo incorrecto → `422`;
- adjunto válido → `201`, fila ligada y evento `attachment_added`;
- reintento con la misma `clientRequestId` → `200` replay y sin doble vínculo;
- segundo tiquet con el mismo adjunto → `422`.

- [ ] **Step 2: Ejecutar y verificar fallo**

Run: `pnpm --filter @axia/server exec vitest run test/db/attachments-http.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar vínculo y flujo**

En `createInTransaction`, tras insertar el tiquet, resolver los tipos del problema y llamar a
`linkAttachment`; si falla, la transacción revierte el tiquet. En `finalizeCreate`, escribir
`attachment_added` con `clientRequestId: null` y payload `{ attachmentId, fileName, mimeType }`.

- [ ] **Step 4: Verificar GREEN**

Run: `pnpm --filter @axia/server exec vitest run test/db/attachments-http.test.ts test/db/tickets-create-http.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/attachments apps/server/src/tickets apps/server/test/db/attachments-http.test.ts apps/server/test/db/tickets-create-http.test.ts
git commit -m "feat: exige adjunto al crear el tiquet"
```

---

### Task 5: Listado y descarga autenticada

**Files:**
- Modify: `apps/server/src/attachments/routes.ts`
- Modify: `apps/server/src/attachments/service.ts`
- Modify: `apps/server/test/db/attachments-http.test.ts`

**Interfaces:**
- Produces:
  - `GET /api/tickets/:id/attachments` → `{ items: [{ id, fileName, mimeType, sizeBytes, uploadedByName, createdAt }] }`
  - `GET /api/attachments/:id/file` → descarga con cabeceras seguras.

- [ ] **Step 1: Escribir pruebas RED**

- lista visible con `ticket.view`; sin visibilidad → `404`;
- descarga `200` con `content-type` verificado, `content-disposition: attachment` y `nosniff`;
- fila `pending` o sin ligar → `404`;
- usuario sin `ticket.view` → `403`.

- [ ] **Step 2: Ejecutar y verificar fallo**

Run: `pnpm --filter @axia/server exec vitest run test/db/attachments-http.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar rutas y cabeceras**

Sanear el nombre para `Content-Disposition` (sin CR/LF/comillas), usar `filename*` UTF-8 y
`Cache-Control: private, no-store`.

- [ ] **Step 4: Verificar GREEN**

Run: `pnpm --filter @axia/server exec vitest run test/db/attachments-http.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/attachments apps/server/test/db/attachments-http.test.ts
git commit -m "feat: lista y descarga adjuntos con autorización"
```

---

### Task 6: Recaptura con adjunto

**Files:**
- Modify: `apps/server/src/tickets/schemas.ts`
- Modify: `apps/server/src/tickets/actions.ts`
- Modify: `apps/server/src/tickets/recapture.ts`
- Modify: `apps/server/src/attachments/link.ts`
- Modify: `apps/server/test/db/tickets-recapture-http.test.ts`
- Modify: `apps/server/test/db/attachments-http.test.ts`

**Interfaces:**
- Consumes: `problemAttachmentTypes`, `linkAttachment`, `findSatisfyingAttachment`.
- Produces: `recapture` acepta `attachmentId?: string`; `RecaptureInput.attachmentId?: string | null`.

- [ ] **Step 1: Escribir pruebas RED**

- recapturar a problema con regla y sin adjunto → `422`;
- con `attachmentId` válido → éxito, adjunto ligado y evento;
- con un adjunto compatible ya ligado → éxito sin pedir otro;
- recapturar sin cambiar el problema no bloquea un tiquet histórico;
- el tiquet derivado de una reclamación `new_ticket` se crea sin bloquear.

- [ ] **Step 2: Ejecutar y verificar fallo**

Run: `pnpm --filter @axia/server exec vitest run test/db/tickets-recapture-http.test.ts test/db/attachments-http.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar la validación en la transacción**

En `recaptureInTransaction`, después del bloqueo, calcular el problema destino; si cambió a uno con
tipos, verificar un adjunto compatible o ligar el `attachmentId` recibido. Escribir
`attachment_added` en la misma transacción.

- [ ] **Step 4: Verificar GREEN**

Run: `pnpm --filter @axia/server exec vitest run test/db/tickets-recapture-http.test.ts test/db/attachments-http.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/tickets apps/server/src/attachments apps/server/test/db
git commit -m "feat: exige adjunto al recapturar a ciertos problemas"
```

---

### Task 7: Catálogo y administración en el servidor

**Files:**
- Modify: `apps/server/src/catalogs/repository.ts`
- Modify: `apps/server/src/catalogs/admin.ts`
- Modify: `apps/server/src/catalogs/admin-routes.ts`
- Modify: `apps/server/src/catalogs/admin-row-columns.ts`
- Modify: `apps/server/src/catalogs/admin-row-queries.ts`
- Modify: `apps/server/test/db/catalogs-http.test.ts`
- Modify: `apps/server/test/db/catalogs-admin-rows.test.ts`

**Interfaces:**
- Produces:
  - `ProblemOption` incluye `requiredAttachmentTypes: string[]` y `attachmentInstructions: string | null`.
  - `AdminValues` acepta `string[]`.
  - Guardado de `problems` rechaza MIME fuera de la lista y duplicados.
  - Lectura administrativa devuelve ambas columnas.

- [ ] **Step 1: Escribir pruebas RED**

- `/api/catalogs/problems?subcategoryId=…` devuelve los campos nuevos;
- guardar `attachment_required_types` válido → `201`/`204`;
- guardar `text/html` o duplicados → `400`;
- la fila administrativa incluye `attachment_required_types` y `attachment_instructions`.

- [ ] **Step 2: Ejecutar y verificar fallo**

Run: `pnpm --filter @axia/server exec vitest run test/db/catalogs-http.test.ts test/db/catalogs-admin-rows.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar**

Extender tipos y consultas; aceptar `z.array(z.string())` en el cuerpo; validar la lista con
`isAttachmentMimeType`; agregar columnas a `COLUMNS` y `READ_COLUMNS`.

- [ ] **Step 4: Verificar GREEN**

Run: `pnpm --filter @axia/server exec vitest run test/db/catalogs-http.test.ts test/db/catalogs-admin-rows.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/catalogs apps/server/test/db/catalogs-http.test.ts apps/server/test/db/catalogs-admin-rows.test.ts
git commit -m "feat: configura tipos de adjunto por problema"
```

---

### Task 8: Administración web con multiselect

**Files:**
- Modify: `apps/web/src/features/admin/domain/catalog-types.ts`
- Modify: `apps/web/src/features/admin/domain/form-values.ts`
- Modify: `apps/web/src/features/admin/domain/catalogs-classification.ts`
- Modify: `apps/web/src/features/admin/components/catalog-field-input.tsx`
- Modify: `apps/web/src/features/admin/api/admin-api.ts`
- Modify: `apps/web/src/features/admin/catalogs-i18n.ts`
- Modify: `apps/web/src/features/admin/i18n.ts`
- Modify: `apps/web/src/features/admin/domain/catalog-import-specs.ts`
- Modify: `apps/web/src/features/admin/domain/catalog-import.ts`
- Modify: `apps/web/src/features/admin/domain/catalog-export.ts`
- Modify: `apps/web/src/features/admin/domain/catalog-cell.ts` (si aplica)
- Test: `apps/web/src/features/admin/domain/form-values.test.ts`
- Test: `apps/web/src/features/admin/domain/catalog-export.test.ts`
- Test: `apps/web/src/features/admin/components/catalog-table.test.tsx` (si aplica)

**Interfaces:**
- Consumes: `AdminValues` con `string[]`.
- Produces: `AdminFieldKind` incluye `'multiselect-fixed'`; el formulario guarda y precarga arreglos.
  La importación/exportación usa un tipo de columna `'mime-list'` que serializa como lista separada
  por comas y valida contra la lista segura.

- [ ] **Step 1: Escribir pruebas RED**

- `toAdminValues` convierte `multiselect-fixed` en `string[]` y rechaza vacío si es obligatorio;
- `initialValues` precarga un arreglo;
- la exportación de problemas escribe los MIME separados por comas;
- la importación convierte esa lista en un arreglo y rechaza un MIME desconocido;
- el formulario de problemas muestra las seis casillas.

- [ ] **Step 2: Ejecutar y verificar fallo**

Run: `pnpm --filter @axia/web exec vitest run src/features/admin/domain/form-values.test.ts src/features/admin/domain/catalog-export.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar**

Agregar el tipo de campo, el render con `Checkbox`, la conversión de arreglos y las etiquetas.
Agregar al catálogo de problemas los campos y la columna de resumen. Extender `CellValue` y las
funciones de importación/exportación para `mime-list`.

- [ ] **Step 4: Verificar GREEN**

Run: `pnpm --filter @axia/web exec vitest run src/features/admin`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/admin
git commit -m "feat: admin configura adjuntos por problema"
```

---

### Task 9: Dominio y API web de adjuntos

**Files:**
- Create: `apps/web/src/features/tickets/domain/attachments.ts`
- Create: `apps/web/src/features/tickets/domain/attachments.test.ts`
- Create: `apps/web/src/features/tickets/api/attachments-api.ts`
- Create: `apps/web/src/features/tickets/hooks/use-attachments.ts`
- Modify: `apps/web/src/features/catalogs/domain/types.ts`
- Modify: `apps/web/src/features/tickets/domain/types.ts`
- Test: `apps/web/src/features/tickets/api/attachments-api.test.ts` (si el patrón existe)

**Interfaces:**
- Produces:
  - `ATTACHMENT_TYPE_OPTIONS: { mime, label, extensions }[]`
  - `acceptFor(types: string[]): string`
  - `requiredTypesForProblem(problem: ProblemOption | undefined): string[]`
  - `reserveAttachment(input): Promise<AttachmentReservation>`
  - `uploadAttachment(reservation, file, onProgress): Promise<void>`
  - `useUploadAttachment()`, `useTicketAttachments(ticketId)`.

- [ ] **Step 1: Escribir pruebas RED del dominio**

- `acceptFor` devuelve solo los MIME pedidos;
- un problema sin tipos no exige adjunto;
- un problema con tipos exige adjunto.

- [ ] **Step 2: Ejecutar y verificar fallo**

Run: `pnpm --filter @axia/web exec vitest run src/features/tickets/domain/attachments.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar dominio y API**

Reutilizar `uploadResumable` de `lib/offline/tus.ts`; no tocar la cola offline.

- [ ] **Step 4: Verificar GREEN**

Run: `pnpm --filter @axia/web exec vitest run src/features/tickets/domain/attachments.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/tickets apps/web/src/features/catalogs
git commit -m "feat: dominio y API web de adjuntos"
```

---

### Task 10: Alta web con campo obligatorio

**Files:**
- Create: `apps/web/src/features/tickets/components/required-attachment-field.tsx`
- Modify: `apps/web/src/features/tickets/components/ticket-form.tsx`
- Modify: `apps/web/src/features/tickets/hooks/use-create-ticket-form.ts`
- Modify: `apps/web/src/features/tickets/hooks/use-create-ticket-submission.ts`
- Modify: `apps/web/src/features/tickets/api/tickets-api.ts`
- Modify: `apps/web/src/features/tickets/i18n.ts`
- Test: `apps/web/src/features/tickets/hooks/use-create-ticket-submission.test.ts` (nuevo)
- Test: `apps/web/src/features/tickets/components/ticket-form.test.tsx` (si se crea)

**Interfaces:**
- Consumes: `requiredTypesForProblem`, `useUploadAttachment`.
- Produces:
  - `RequiredAttachmentField` con `types`, `file`, `error`, `hint`, `onChange`.
  - `useCreateTicketForm` devuelve `attachment`, `setAttachment`, `requiredAttachmentTypes`,
    `isUploadingAttachment`.

- [ ] **Step 1: Escribir pruebas RED**

- sin archivo y con problema que exige → no llama a `createTicket`;
- con archivo → reserva, sube y después crea con `attachmentId`;
- error de subida → no crea y muestra error;
- cambiar de problema limpia el archivo.

- [ ] **Step 2: Ejecutar y verificar fallo**

Run: `pnpm --filter @axia/web exec vitest run src/features/tickets/hooks/use-create-ticket-submission.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar**

El envío sube primero y crea después; el botón muestra "Subiendo archivo…". El campo usa
`FileField` con `accept` calculado y la instrucción del problema.

- [ ] **Step 4: Verificar GREEN**

Run: `pnpm --filter @axia/web exec vitest run src/features/tickets/hooks/use-create-ticket-submission.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/tickets
git commit -m "feat: alta web exige el adjunto del problema"
```

---

### Task 11: Detalle web con sección de adjuntos

**Files:**
- Create: `apps/web/src/features/tickets/components/ticket-attachments-list.tsx`
- Modify: `apps/web/src/features/tickets/components/ticket-detail-sections.tsx`
- Modify: `apps/web/src/features/tickets/components/ticket-detail.tsx`
- Modify: `apps/web/src/features/tickets/domain/types.ts` (`EVENT_TYPES`)
- Modify: `apps/web/src/features/tickets/events-i18n.ts`
- Modify: `apps/web/src/features/tickets/components/ticket-timeline.tsx`
- Modify: `apps/web/src/features/tickets/i18n.ts`
- Modify: `apps/web/src/features/tickets/detail-hints.ts`
- Test: `apps/web/src/features/tickets/components/ticket-attachments-list.test.tsx`

**Interfaces:**
- Consumes: `useTicketAttachments`.
- Produces: sección "Adjuntos" separada de "Evidencias", con nombre, tipo, tamaño, fecha y
  descarga.

- [ ] **Step 1: Escribir prueba RED**

Renderiza un adjunto y verifica nombre, tamaño, enlace de descarga y ausencia de vista previa;
sin adjuntos muestra el vacío.

- [ ] **Step 2: Ejecutar y verificar fallo**

Run: `pnpm --filter @axia/web exec vitest run src/features/tickets/components/ticket-attachments-list.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar la lista y montarla en el detalle**

Agregar la etiqueta e icono de `attachment_added` al timeline y a `EVENT_TYPES`.

- [ ] **Step 4: Verificar GREEN**

Run: `pnpm --filter @axia/web exec vitest run src/features/tickets/components/ticket-attachments-list.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/tickets
git commit -m "feat: muestra adjuntos en el detalle"
```

---

### Task 12: Recaptura web y bloqueo offline

**Files:**
- Modify: `apps/web/src/features/tickets/components/recapture-fields.tsx`
- Modify: `apps/web/src/features/tickets/hooks/use-recapture-form.ts`
- Modify: `apps/web/src/features/tickets/api/ticket-commands.ts`
- Modify: `apps/web/src/features/tickets/i18n.ts`
- Test: `apps/web/src/features/tickets/hooks/use-recapture-form.test.ts` (nuevo)

**Interfaces:**
- Consumes: `useTicketAttachments`, `requiredTypesForProblem`, `useUploadAttachment`.
- Produces: `recapture` envía `attachmentId`; sin conexión y sin adjunto compatible bloquea.

- [ ] **Step 1: Escribir pruebas RED**

- problema destino con regla y sin adjunto → no muta y muestra error;
- con archivo → sube y envía `attachmentId`;
- offline con requisito → no encola y muestra aviso;
- offline sin requisito → sigue el flujo actual.

- [ ] **Step 2: Ejecutar y verificar fallo**

Run: `pnpm --filter @axia/web exec vitest run src/features/tickets/hooks/use-recapture-form.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar**

Agregar `attachmentId` al esquema de comando y a `RecaptureInput`; condicionar el campo y el envío.

- [ ] **Step 4: Verificar GREEN**

Run: `pnpm --filter @axia/web exec vitest run src/features/tickets/hooks/use-recapture-form.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/tickets
git commit -m "feat: recaptura exige adjunto cuando corresponde"
```

---

### Task 13: E2E, demo, documentación y cierre

**Files:**
- Modify: `apps/web/e2e/*` (flujo `@smoke` de alta con adjunto)
- Modify: `apps/server/src/db/seed-demo/*` (un problema con regla y un adjunto sintético)
- Modify: `docs/concepts/negocio.md`, `docs/concepts/datos.md`, `docs/concepts/arquitectura.md`
- Modify: `docs/reference/api.md`, `docs/reference/configuracion.md`
- Create: `docs/decisions/0122-adjuntos-obligatorios-por-problema.md`
- Modify: `docs/decisions/README.md`
- Modify: `docs/internal/estado.md`, `CHANGELOG.md`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: flujo crítico probado y documentación canónica actualizada.

- [ ] **Step 1: Escribir el E2E**

Alta con problema que exige PDF: sin archivo no se crea; con PDF se crea y se descarga desde el
detalle; `before`/`after` siguen funcionando.

- [ ] **Step 2: Ejecutar y verificar fallo**

Run: `pnpm test:e2e:smoke`
Expected: FAIL hasta completar la UI.

- [ ] **Step 3: Implementar demo y documentación**

Semilla demo, ADR 0122, referencias y estado. No reescribir tiquets existentes.

- [ ] **Step 4: Ejecutar la verificación de cierre**

Run: `pnpm check:fast`
Expected: PASS.
Run: `pnpm test:affected`
Expected: PASS.
Run: `pnpm test:e2e:smoke`
Expected: PASS.
Run: `pnpm check`
Expected: PASS (compuerta completa).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: cierra adjuntos obligatorios por problema"
```
