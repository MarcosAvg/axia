# Adjuntos obligatorios por problema — diseño

**Fecha:** 2026-11-06
**Estado:** propuesto
**Decisión de arquitectura prevista:** ADR 0122

## Intención

Algunos problemas de mantenimiento necesitan un documento que no es una fotografía: una
cotización, un plano, una ficha técnica o un reporte. Hoy Axia solo admite evidencias de imagen
(`request`, `before`, `during`, `after`, `claim`, `other`) y las normaliza a WebP.

Se quiere que **ciertos problemas exijan adjuntar un archivo al registrar el tiquet**. Ese archivo:

- es un **adjunto**, no una evidencia;
- no satisface `before`, `after`, `claim` ni ninguna precondición de evidencia;
- no altera la política de evidencia `request` (que sigue siendo opcional o recomendada);
- queda ligado al tiquet en el alta (los tiquets derivados de una reclamación quedan exentos, ver
  §4.1);
- se guarda de forma privada y se descarga con autorización.

La regla se configura por problema: qué tipos de archivo se aceptan y, opcionalmente, una
instrucción para quien registra.

## Objetivos

1. Configurar en administración, por cada problema, cero o más tipos de adjunto obligatorio y un
   texto de ayuda opcional.
2. Bloquear el alta del tiquet, en interfaz y servidor, cuando el problema elegido exige un
   adjunto y no se aporta uno válido.
3. Guardar el archivo original con nombre, tipo verificado, tamaño y hash; sin miniatura ni
   conversión a WebP.
4. Permitir la descarga solo a quien puede ver el tiquet, con cabeceras que impidan ejecución
   inline.
5. Registrar el hecho en la bitácora del tiquet.
6. Mantener la regla al recapturar a un problema que exija adjunto.
7. No tocar el flujo, las tablas ni las precondiciones de evidencia.

## No objetivos

- Adjuntos opcionales en tiquets cuyos problemas no los exigen.
- Más de un adjunto ligado en una misma alta o recaptura, o más de un requisito simultáneo.
- Vista previa, miniaturas o edición de adjuntos.
- Adjuntos durante el alta offline. El alta de tiquets sigue requiriendo conexión.
- Rellenar retroactivamente tiquets existentes.
- Antivirus o análisis de malware; se mitiga con tipos permitidos y descarga forzada.
- Importar adjuntos desde sistemas externos.

## Anti-objetivos

- Reutilizar `evidence` o contarla como evidencia.
- Confiar en el `Content-Type` o la extensión que declara el cliente.
- Servir el archivo inline desde el origen de Axia.
- Bloquear tiquets históricos al desplegar la regla.
- Aceptar HTML, SVG, JavaScript, ejecutables o cualquier tipo fuera de la lista segura.

## Restricciones

- Monorepo pnpm; PostgreSQL 17, Fastify 5, Drizzle, TUS, Sharp, React, TanStack Query,
  React Hook Form + Zod, shadcn/ui.
- Sin RLS: la autorización vive en el servidor y toda consulta de tiquets aplica alcance.
- Migraciones nuevas en `apps/server/db/migrations/`; no se editan las integradas.
- Nuevas tablas necesitan `grant select, insert, update` a `axia_app`; sin `delete`.
- Límites de `docs/reference/convenciones-codigo.md`: archivo 300 líneas, función 60,
  componente 150, 4 parámetros, anidación 3.
- Código, tablas y columnas en inglés; interfaz y documentación en español es-MX.
- Fechas `timestamptz`.

## Enfoques considerados

### A. Subida previa y alta atómica (elegido)

El archivo se sube a un área de preparación antes de crear el tiquet. El alta envía el
identificador del adjunto; el servidor verifica y lo liga en la misma transacción que crea el
tiquet. Si el adjunto falta, no está listo, pertenece a otra persona o su tipo no corresponde al
problema, no se crea nada.

Ventaja: el tiquet nunca existe incumpliendo la regla. Coste: una fila de preparación, limpieza de
subidas abandonadas y esperar a que termine la subida antes de ver el folio.

### B. Crear primero y subir después

Se crea el tiquet y luego se sube el adjunto; mientras falte, se bloquea iniciar el trabajo.

Ventaja: reutiliza casi entero el flujo actual. Desventaja: durante la subida —o para siempre si
falla— existe un tiquet que incumple la regla, y el requisito deja de ser "al crear".

### C. Multipart en el alta

Una sola petición con tiquet y archivo.

Ventaja: lectura simple. Desventaja: rompe TUS, la reanudación, el límite de tamaño y la
separación entre datos y archivos; duplica el procesamiento.

**Decisión:** A.

## Diseño

### 1. Vocabulario y modelo de datos

Dos conceptos separados:

- **Evidencia:** lo existente en `public.evidence`; imágenes con tipos de flujo.
- **Adjunto:** documento obligatorio de ciertos problemas, en `public.ticket_attachments`.

No se crea ninguna relación entre ambas tablas ni se suman sus conteos.

#### Migración 0029 — tabla y configuración

```sql
create table public.ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references public.tickets(id),
  client_request_id uuid not null unique,
  uploaded_by uuid not null references public.users(id),
  original_name text not null,
  declared_mime_type text,
  mime_type text,
  size_bytes bigint,
  sha256 text,
  storage_path text,
  processing_state text not null default 'pending',
  processing_error text,
  created_at timestamptz not null default now(),
  linked_at timestamptz,
  constraint ticket_attachments_state_check
    check (processing_state in ('pending', 'ready', 'failed')),
  constraint ticket_attachments_size_check
    check (size_bytes is null or size_bytes >= 0),
  constraint ticket_attachments_link_check
    check ((ticket_id is null) = (linked_at is null))
);

create index ticket_attachments_ticket_idx
  on public.ticket_attachments (ticket_id, created_at);

alter table public.problems
  add column attachment_required_types text[] not null default '{}',
  add column attachment_instructions text;

alter table public.problems
  add constraint problems_attachment_types_check
  check (
    attachment_required_types <@ array[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]::text[]
  );

grant select, insert, update on public.ticket_attachments to axia_app;
```

Notas:

- `ticket_id` es nulo mientras el adjunto está en preparación; se llena una sola vez al ligarlo.
- `linked_at` y `ticket_id` son ambos nulos o ambos no nulos.
- `original_name` conserva el nombre elegido por la persona; se sanea solo al construir la
  cabecera `Content-Disposition`.
- `declared_mime_type` es lo que dijo el cliente; `mime_type` es lo verificado por el servidor.
- No se concede `delete`: las filas ligadas son historial y las abandonadas se marcan `failed`.
- La restricción del arreglo es la lista segura de tipos. Un tipo nuevo exige migración y
  actualizar la lista de la web.

#### Migración 0030 — evento

```sql
alter type public.event_type add value 'attachment_added';
```

No se usa el valor dentro de la misma migración. El evento se inserta al crear o recapturar.

### 2. Lista segura de tipos (v1)

| MIME | Extensiones | Verificación |
|---|---|---|
| `application/pdf` | `.pdf` | `file-type` (cabecera `%PDF-`) |
| `image/jpeg` | `.jpg`, `.jpeg` | `file-type` |
| `image/png` | `.png` | `file-type` |
| `image/webp` | `.webp` | `file-type` |
| `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `.docx` | `file-type` (OOXML por `[Content_Types].xml` o `word/`) |
| `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | `.xlsx` | `file-type` (OOXML por `[Content_Types].xml` o `xl/`) |

Se añade la dependencia **`file-type`** (MIT, repo oficial `sindresorhus/file-type`, versión 22.x,
Node ≥22; el proyecto usa Node 24). Verificado en el registro y activo. Detecta PDF, imágenes y
OOXML desde los bytes, y para ZIP aplica límites de tamaño por entrada y número de entradas, lo
que evita bombas de descompresión. Se usa solo en el servidor.

Las variantes con macros (`.docm`, `.xlsm`) se detectan como su tipo base. Axia nunca abre ni
ejecuta el archivo: solo lo guarda y lo entrega como descarga, así que el riesgo de macros queda
en el cliente que lo abra. Si una instancia quiere excluirlas, puede rechazar por extensión en una
iteración posterior.

La lista se duplica en servidor (autoridad) y web (etiquetas y `accept`). No hay paquete
compartido en el monorepo y no se crea uno para seis constantes.

### 3. Flujo de alta con adjunto (opción A)

1. La persona elige el problema. El catálogo de problemas expone
   `requiredAttachmentTypes` y `attachmentInstructions`.
2. Si el problema exige adjunto, el formulario muestra un campo obligatorio con los tipos
   aceptados y la instrucción. Al cambiar de problema se descarta el archivo y la preparación
   anterior.
3. Al enviar, después del chequeo de duplicados:
   - `POST /api/attachments` reserva la preparación con `{ clientRequestId, problemId,
     ticketId?, fileName, declaredMimeType, sizeBytes }` y devuelve `{ attachment, uploadUrl,
     maxSize, quotaRemaining, replayed }`. `ticketId` solo se envía al recapturar.
   - El cliente sube el archivo por TUS a `/api/attachment-uploads` con metadatos
     `{ attachmentId }` y espera a que el servidor lo marque `ready`.
   - El alta envía `attachmentId` junto con los datos actuales del tiquet.
4. El servidor, en la transacción de alta, bloquea la fila del adjunto y verifica:
   - `ticket_id is null`, `processing_state = 'ready'`, `uploaded_by = actor.id`;
   - `mime_type` pertenece a `problems.attachment_required_types` del problema elegido;
   - el problema realmente exige al menos un tipo.
   Si algo falla, responde `422` con un mensaje comprensible y no crea el tiquet.
5. Al ligar: `ticket_id`, `linked_at = now()` y evento `attachment_added` en la misma transacción.
6. La respuesta del alta no cambia; la web navega al detalle y allí aparece el adjunto.

Reintentos:

- La reserva es idempotente por `client_request_id`; repetirla devuelve la misma fila.
- Si la subida termina pero el alta falla por red, la preparación sigue disponible y el
  reintento con el mismo `clientRequestId` reutiliza el adjunto.
- Si el alta ya se había aplicado, la idempotencia existente devuelve el tiquet y el adjunto ya
  está ligado; no se liga dos veces.
- Un adjunto ligado no puede reutilizarse en otro tiquet.

Autorización de la reserva:

- Sin `ticketId`: exige `ticket.create` o `ticket.create_on_behalf`; es el caso del alta.
- Con `ticketId`: exige `ticket.recapture` y visibilidad del tiquet; es el caso de la recaptura.
  La acción de recaptura vuelve a validar permiso, titularidad y precondiciones al aplicarse.
- El TUS siempre exige que la fila sea del actor y no esté ligada.

Semántica de "un adjunto":

- El alta liga **como máximo uno**. La recaptura puede ligar otro cuando el problema nuevo exige
  un tipo que ningún adjunto ligado satisface.
- La regla se cumple si existe **al menos un adjunto ligado** cuyo `mime_type` esté permitido.
- No hay índice único por `ticket_id`: el detalle lista todos los adjuntos y cada uno queda como
  historial.

### 4. Recaptura

Cuando la recaptura cambia el problema a uno que exige adjunto:

- si el tiquet ya tiene un adjunto ligado cuyo `mime_type` está permitido, no se pide nada;
- si no lo tiene, la acción acepta un `attachmentId` opcional y lo liga con las mismas
  verificaciones antes de aplicar el cambio;
- sin `attachmentId` válido, la recaptura responde `422` y no cambia nada.

La regla solo se evalúa cuando el problema cambia. Un tiquet histórico cuyo problema ya exigía
adjunto antes de la regla no se bloquea al recapturar otros campos. Esto evita bloqueos
retroactivos.

El formulario de recaptura reutiliza el mismo campo condicional y el mismo hook de subida.

**Recaptura sin conexión.** Si el problema destino exige un adjunto que el tiquet no tiene, la
recaptura no puede encolarse: la cola de salida no sube archivos y el servidor rechazaría la
acción al sincronizar. La interfaz lo detecta antes de encolar y muestra que se necesita conexión
para adjuntar el archivo. Las recapturas que no cambian a un problema con adjunto siguen
funcionando offline como hoy.

### 4.1 Tiquets derivados de una reclamación

`copyDerivedTicket` crea un tiquet enlazado `derived_from` con el mismo problema y sin pasar por
el alta. Para no bloquear la resolución de una reclamación ni duplicar archivos, **el tiquet
derivado queda exento de la regla de alta**: es una continuación del original y el adjunto sigue
en el tiquet enlazado. El detalle muestra el enlace `derived_from` existente; no se copia ni se
comparte el archivo. Si más adelante se recaptura el derivado a un problema con adjunto, se aplica
la regla normal de recaptura.

### 5. API

| Método | Ruta | Uso | Permiso |
|---|---|---|---|
| `POST` | `/api/attachments` | Reservar adjunto en preparación | `ticket.create` o `ticket.create_on_behalf` |
| `POST/PATCH/HEAD/GET` | `/api/attachment-uploads` | TUS del adjunto | sesión y propiedad de la fila |
| `GET` | `/api/tickets/:id/attachments` | Listar adjuntos ligados | `ticket.view` y visibilidad |
| `GET` | `/api/attachments/:id/file` | Descargar | `ticket.view` y visibilidad |
| `POST` | `/api/tickets` | Alta con `attachmentId` opcional | sin cambio |
| `POST` | `/api/tickets/:id/actions` | Recaptura con `attachmentId` opcional | sin cambio |

Detalles:

- El TUS de adjuntos vive en una ruta separada para no tocar el de evidencias. Reutiliza
  `FileStore`, la autenticación por cookie y el mismo volumen; los temporales van a
  `uploads/attachments/`.
- `onUploadCreate` verifica que la fila exista, sea del actor, esté `pending` y no esté ligada.
  Aplica `ATTACHMENT_MAX_BYTES` y la cuota del cargador.
- `onUploadFinish` procesa el archivo: detecta el tipo real, lo escribe en
  `files/attachments/<id>.<ext>`, calcula SHA-256 y marca `ready`. Si el tipo no es válido o no
  está permitido por el problema, marca `failed`, borra el temporal y responde `415`/`422`.
- `GET /api/attachments/:id/file` exige adjunto `ready` y ligado a un tiquet visible. Responde
  `404` opaco si no existe, no está ligado o el tiquet no es visible.
- El catálogo `problems` agrega los dos campos nuevos a cada opción.
- El detalle del tiquet no cambia de forma; la lista de adjuntos es una consulta aparte.

### 6. Descarga segura

Respuesta de `/api/attachments/:id/file`:

- `Content-Type` con el MIME **verificado**, no el declarado.
- `Content-Disposition: attachment; filename="<ascii>"; filename*=UTF-8''<encoded>`.
- `X-Content-Type-Options: nosniff`.
- `Content-Security-Policy: sandbox`.
- `Cache-Control: private, no-store`.
- Cuerpo con `createReadStream`.

El nombre se sanea: se quitan `CR`, `LF`, comillas y caracteres de control, y se limita su
longitud. La ruta almacenada se resuelve con `resolveStored` para impedir escapes del volumen.

### 7. Administración

- Nuevo tipo de campo `multiselect-fixed` en el formulario genérico de catálogos, con casillas
  para PDF, JPEG, PNG, WebP, DOCX y XLSX.
- El problema muestra:
  - **Tipos de adjunto obligatorio** (vacío = no exige).
  - **Instrucción del adjunto** (texto opcional).
- La tabla de problemas agrega una columna que resume los tipos o muestra "—".
- El servidor valida el arreglo al guardar: solo valores de la lista segura, sin duplicados;
  cualquier otro valor responde `400`.
- El formulario genérico y sus tipos (`AdminValues`, `RawValues`, `toAdminValues`, API y esquema
  del cuerpo) se amplían para aceptar `string[]`.
- Exportación e importación de problemas incluyen ambos campos; la importación acepta una lista
  separada por comas de MIME válidos.

### 8. Interfaz

**Alta**

- Campo condicional "Adjunto obligatorio" con la instrucción del problema.
- `accept` construido con los MIME permitidos.
- Validación local: si el problema exige y no hay archivo, error junto al campo y envío bloqueado.
- Durante la subida: estado "Subiendo archivo…" con porcentaje y sin permitir doble envío.
- Errores del servidor (`422`) visibles; si falla la subida, no se crea el tiquet.
- Si no hay conexión, mensaje explícito: el alta con adjunto requiere conexión.

**Detalle**

- Sección "Adjuntos", separada de "Evidencias".
- Cada elemento muestra nombre original, tipo legible, tamaño, fecha, quién lo subió y un botón
  de descarga.
- No hay vista previa ni miniatura.

**Recaptura**

- Mismo campo condicional cuando el problema destino lo exige y el tiquet no tiene un adjunto
  compatible.

### 9. Configuración

Nuevas variables en `apps/server/src/config.ts`:

| Variable | Valor por defecto |
|---|---|
| `ATTACHMENT_MAX_BYTES` | `26214400` (25 MiB) |
| `ATTACHMENT_QUOTA_BYTES` | `524288000` (500 MiB) |
| `ATTACHMENT_CLEANUP_HOURS` | `24` |

- `STORAGE_DIR` se reutiliza; los adjuntos viven bajo `files/attachments/` y
  `uploads/attachments/`.
- La cuota es por cargador y solo cuenta adjuntos.
- Actualizar `.env.dev.example`, `compose.yaml`, `docs/reference/configuracion.md` y la
  documentación de despliegue.

### 10. Limpieza

Extender el CLI de limpieza existente (`pnpm db:cleanup-evidence` o un comando nuevo
`pnpm db:cleanup-attachments`) para:

- buscar filas **sin ligar** (`ticket_id is null`) en estado `pending` o `ready` con
  `created_at` anterior al umbral;
- borrar los temporales del TUS y los archivos ya procesados de esas filas;
- marcarlas `failed` con "Subida abandonada".

Nunca se borran filas ligadas ni archivos de tiquets. La cuota cuenta todos los adjuntos `ready`
(ligados o no), de modo que una preparación abandonada consume cuota hasta que la limpieza la
libera. Preferencia: un comando nuevo para que el operador pueda programarlo por separado, sin
cambiar el actual.

### 11. Bitácora y eventos

- Nuevo tipo `attachment_added` con payload `{ attachmentId, fileName, mimeType }`.
- Se escribe al ligar en el alta y al ligar en la recaptura.
- `client_request_id` del evento es `null`: el evento forma parte de la transacción idempotente
  de la acción, y la columna es única por evento.
- Igual que `evidence_added`, `attachment_added` **no** entra en
  `instance_settings.requester_visible_event_types` por defecto: el solicitante ve el adjunto en su
  sección, pero el evento queda en la bitácora interna. No se reescriben filas de configuración
  existentes.
- Actualizar `EVENT_TYPES` de la web, `events-i18n.ts`, icono del timeline y cualquier lista de
  eventos que deba mostrarlo.
- Métricas y reportes no cambian.

### 12. Demo

- Marcar un problema del demo con adjunto obligatorio (por ejemplo, un PDF) y sembrar un tiquet
  coherente con un adjunto sintético.
- No reescribir tiquets existentes ni inventar datos.

## Pruebas

### Servidor + PostgreSQL real

- Reserva: problema sin regla → `422`; con regla y MIME permitido → `201`; MIME no permitido →
  `422`; problema inexistente o inactivo → `400`/`404`; reserva con `ticketId` sin
  `ticket.recapture` → `403`; reserva de un tiquet no visible → `404`.
- TUS: no se puede subir a una fila de otra persona; no se puede reutilizar una fila ligada;
  tamaño y cuota se aplican.
- Procesamiento: PDF válido, imagen válida, DOCX válido, XLSX válido, archivo con cabecera falsa
  o ZIP que no sea OOXML → `failed` y sin archivo.
- Alta: sin adjunto → `422`; con adjunto de otro usuario → `404`/`422`; con tipo incorrecto →
  `422`; con adjunto válido → `201`, fila ligada y evento `attachment_added`; reintento del alta
  → `200` replay sin doble ligado; segundo tiquet con el mismo adjunto → `422`.
- Recaptura: problema nuevo con regla y sin adjunto → `422`; con adjunto válido → éxito; con
  adjunto ya ligado compatible → éxito sin pedir otro.
- Reclamación con resolución `new_ticket`: el tiquet derivado se crea sin bloquear aunque su
  problema exija adjunto.
- Descarga: `ticket.view` positivo y negativo; tiquet no visible → `404`; fila `pending` o no
  ligada → `404`; cabeceras `attachment` y `nosniff`.
- Limpieza: fila abandonada se marca `failed` y se borran temporales; fila ligada no se toca.
- Administración: guardar arreglo válido, rechazar MIME desconocido, leer columnas nuevas.
- Migración: instalación limpia y checksums.

### Web

- El campo aparece solo cuando el problema lo exige y muestra la instrucción.
- Sin archivo no se envía; al cambiar de problema se limpia.
- `accept` contiene solo los tipos configurados.
- Éxito: reserva, subida y alta en orden; error de subida no crea el tiquet; error `422` visible.
- Detalle: lista, metadatos y descarga.
- Recaptura: campo condicional y envío del `attachmentId`.
- Recaptura sin conexión a un problema con adjunto: se bloquea con aviso y no se encola.
- Administración: multiselect guarda y precarga.

### E2E `@smoke`

- Un problema configurado exige PDF: el alta se bloquea sin archivo, se sube un PDF de prueba, se
  crea el tiquet y se descarga desde el detalle.
- La evidencia `before`/`after` sigue funcionando igual y no cuenta el adjunto.

## Documentación

- `docs/concepts/negocio.md`: nueva sección "Adjuntos" separada de "Evidencias"; regla de alta y
  recaptura.
- `docs/concepts/datos.md`: tabla `ticket_attachments` y campos nuevos de `problems`.
- `docs/concepts/arquitectura.md`: almacenamiento, TUS separado y descarga forzada.
- `docs/reference/api.md`: rutas, permisos y contratos.
- `docs/reference/configuracion.md`: variables nuevas.
- `docs/decisions/0122-adjuntos-obligatorios-por-problema.md`: contexto, alternativas, decisión,
  consecuencias y reversión.
- `docs/internal/estado.md` y CHANGELOG al cerrar la tarea.
- `.env.dev.example`, `compose.yaml` y guías de despliegue.

## Reversibilidad y despliegue

- La migración es aditiva: tabla nueva y columnas con valor por defecto vacío. Una versión
  anterior de la app las ignora.
- No hay relleno de datos ni bloqueo retroactivo.
- Para desactivar la regla basta con vaciar los tipos de un problema en administración.
- Revertir el código deja filas y archivos huérfanos pero inofensivos; se pueden conservar como
  historial.

## Decisiones dejadas al constructor

- Nombres exactos de módulos, funciones y componentes, dentro del vocabulario del dominio.
- Si el TUS de adjuntos comparte la fábrica de opciones con el de evidencias o se mantiene
  separado, siempre que no se modifique el comportamiento de evidencias.
- Formato del resumen de tipos en la tabla de administración.
- Textos finales de interfaz, respetando los diccionarios existentes.
- Estrategia de prueba de los archivos sintéticos (bytes mínimos o fixtures pequeños de PDF, DOCX
  y XLSX).

## Decisiones confirmadas por la persona

- Tipos de v1: PDF, JPEG, PNG, WebP, DOCX y XLSX.
- El alta liga un solo adjunto; la recaptura puede añadir otro cuando el problema nuevo exige un
  tipo distinto.
- La regla también se aplica al recapturar a un problema que exige adjunto.
- Los tiquets derivados de una reclamación quedan exentos y conservan el enlace al original.
- La recaptura a un problema con adjunto se bloquea sin conexión.
