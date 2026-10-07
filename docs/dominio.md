# Axia — Dominio (núcleo)

Contexto de negocio que el agente necesita para programar sin intervención humana. Describe
**Axia como plataforma propia**: no menciona ni depende de ningún otro sistema. Lo relativo a
sistemas externos y a la migración de datos vive en `docs/integraciones-y-migracion.md`.

Si algo aquí es ambiguo o falta, **no lo inventes**: regístralo en `docs/ESTADO.md` como
pregunta para la persona (la sección 11 lista decisiones provisionales y preguntas abiertas).

## 1. Propósito

Dar seguimiento exacto a los tiquets de mantenimiento: en qué paso está cada uno y, si no
avanza, **por qué** y en qué estado está ese motivo (por ejemplo, si falta material: si ya se
pidió, si está en cotización, si ya llegó, por qué medio se compró). Cada paso puede llevar
evidencias (fotos, archivos). Funciona en escritorio y móvil (PWA), con uso sin conexión para
los técnicos, autoalojada o en la nube, y open source.

## 2. Roles

| Rol (código) | Quién es | Puede |
|---|---|---|
| `requester` | Quien reporta el problema | Crear tiquets y ver los suyos |
| `dispatcher` | Encargado de la plataforma | Registrar tiquets en nombre de otros, ajustar prioridad, asignar a un supervisor |
| `supervisor` | Supervisor | Asignar (autorizar) a un técnico, reasignar, ver su ámbito |
| `technician` | Técnico de mantenimiento | Iniciar, pausar con bloqueo, avanzar bloqueos, resolver, subir evidencias |
| `admin` | Administrador | Todo, incluidos catálogos, flujos de bloqueo y usuarios |

Los permisos se imponen con RLS y funciones RPC, nunca solo en la interfaz.

## 3. Flujo de trabajo

```
Solicitante ─► Axia (alta) ─► Encargado ─► Supervisor ─► Técnico ─► ejecuta o no
 (catálogos)                  (dispatcher)  (autoriza)             (aquí vive todo el
                                                                    seguimiento detallado)
```

1. Un **solicitante** crea el tiquet en Axia usando los catálogos (edificio, ubicación,
   dependencia, categoría, subcategoría, problema, tipo de servicio, prioridad) y una
   descripción. El **encargado** también puede registrarlo en nombre de alguien (llamada,
   correo, visita). El tiquet nace en `received` con su fecha y hora de reporte.
2. El **encargado** lo asigna a un **supervisor**.
3. El **supervisor** lo asigna a un **técnico**. **Esa asignación es la autorización.**
4. El **técnico** lo realiza o no. Ahí se registra el seguimiento: inicio, pausas con
   bloqueos, evidencias y resolución. A partir de esto se actualiza el estatus.

### Estados del tiquet (macro)

`received` → `with_supervisor` → `with_technician` → `in_progress` → `resolved` → `closed`

Con desvíos: `on_hold` (pausa, con al menos un bloqueo activo), `rejected`, `cancelled`.

Etiquetas en español para la interfaz: Recibido, Con supervisor, Con técnico, En proceso,
En pausa, Resuelto, Cerrado, Rechazado, Cancelado.

Los cambios de estado solo ocurren mediante funciones RPC de transición que validan rol y
transición permitida y escriben un evento en `ticket_events`.

## 4. Asignaciones

Cada salto de la cadena es un registro en `ticket_assignments` (no una columna):

- `stage`: `supervisor` o `technician` (la cadena podrá hacerse configurable en el futuro).
- `assignee_id`, `assigned_by`, `assigned_at`, `ended_at` (si se reasigna), `reason`.

Permite reasignaciones sin perder historia y medir cuánto tarda cada salto. El tiquet registra
además `started_at` (cuándo el técnico empezó realmente) y `finished_at` (cuándo se resolvió),
separados de la asignación.

## 5. Bloqueos (motivos de pausa) — dirigidos por datos

Cuando un tiquet no puede avanzar, el técnico abre un **bloqueo** con un **tipo** (motivo). Cada
tipo tiene su propio flujo de subestados, **definido en catálogos, no en código**, para que el
administrador dé de alta motivos nuevos sin desplegar.

Tablas conceptuales:

- `blocker_types`: motivo (falta de material, técnico no capacitado, sin técnico disponible,
  espera de proveedor…).
- `blocker_states`: estados por tipo (orden, si es final).
- `blocker_transitions`: de qué estado a cuáles se puede pasar y qué rol puede hacerlo.
- `blocker_fields`: campos adicionales que pide cada estado (proveedor, medio de compra,
  fecha estimada de entrega, número de cotización…).
- `ticket_blockers`: bloqueo concreto de un tiquet: tipo, estado actual, `data jsonb` con los
  valores de los campos dinámicos, `opened_at`, `resolved_at`.

Ejemplos de flujos:

- **Falta de material:** por cotizar → en cotización → aprobado → ordenado → en tránsito → entregado.
- **Sin técnico disponible:** buscando técnico → contactando proveedor → proveedor confirmó → programado.

Un tiquet puede tener **varios bloqueos activos** a la vez. Mientras haya al menos uno activo, el
estado macro es `on_hold` (se calcula, no lo cambia una persona a mano). Al resolverse el último,
vuelve a `in_progress`.

## 6. Evidencias y bitácora

- `ticket_events` es la **bitácora de solo agregar**: cada cambio de estado, asignación, bloqueo,
  comentario o nota genera un evento con `actor_id`, `type`, `payload`, `source` y `created_at`.
  `source` indica el origen del evento (`app`, `import`, `integration`) sin nombrar sistemas.
- `attachments` cuelga del **evento**, así cada paso tiene sus propias fotos o archivos.
  Almacenamiento privado con URL firmadas, con límites de tipo y tamaño.

## 7. Catálogos

Administrables por el rol `admin`, con activar/desactivar en lugar de borrar:

- `buildings` → `locations` (ubicaciones dentro de un edificio).
- `dependencies` (unidades que solicitan).
- `categories` → `subcategories` → `problems` (jerarquía de tres niveles).
- `service_types` (correctivo, preventivo…), `priorities` (con orden), `channels` (canal por
  el que se registra el tiquet: web, teléfono, importación…).
- `technicians` (pueden existir sin cuenta de usuario y vincularse después).
- `blocker_types`, `blocker_states`, `blocker_transitions`, `blocker_fields`.

Todo catálogo tiene `id`, `name` único (dentro de su padre), `active` y marcas de tiempo.

## 8. Orígenes e integraciones (visión del núcleo)

- El núcleo no sabe de qué sistema vienen los datos importados. Solo conoce:
  - `channels`: canal de registro del tiquet.
  - `ticket_external_refs(ticket_id, system, external_id)` con `unique(system, external_id)`:
    identificadores en otros sistemas, con `system` como texto libre validado por un catálogo
    `external_systems`.
  - Eventos con `source = 'import'` o `'integration'` para dejar rastro de procedencia.
- Las integraciones son **adaptadores opcionales** en `features/integrations/` y
  `supabase/functions/integration-*`. Axia debe poder desplegarse y usarse sin ninguno.
- Los números de tiquet (`ticket_number`) son un entero único de Axia; un importador puede
  conservar numeraciones previas (ver `docs/integraciones-y-migracion.md`).

## 9. Métricas

**Base (calculables con cualquier tiquet):**

- Volumen por edificio, dependencia, categoría, tipo de servicio, prioridad y estado.
- Intervalo de atención = primera asignación a técnico − `reported_at`.
- Intervalo de trabajo = `finished_at` − primera asignación a técnico.
- Intervalo total = `finished_at` − `reported_at`.
- Solo se calculan cuando ambas fechas existen. El mes se calcula desde `reported_at`.

**Avanzadas (solo tiquets con asignaciones, bloqueos y eventos detallados):** tiempo por tramo
de la cadena (registro → supervisor → técnico → inicio → fin), tiempo en pausa por motivo,
causas de pausa más frecuentes, inicio → fin descontando pausas y antigüedad de pendientes.

Implementación: **vistas SQL** (`v_ticket_metrics_base`, `v_ticket_metrics_advanced`). Los
intervalos y el mes **se calculan, no se almacenan**. Donde falte información, la métrica es
`NULL`; nunca la inventes ni la rellenes con cero. No mezcles ambos niveles en un tablero sin
indicar a qué tiquets aplican. Las gráficas usan Recharts. Debe existir exportación a CSV/XLSX
de las vistas.

## 10. Glosario (negocio ↔ código)

| Español | Código |
|---|---|
| Tiquet | `ticket` |
| Número de tiquet / folio | `ticket_number` |
| Edificio | `building` |
| Ubicación | `location` |
| Dependencia | `dependency` |
| Categoría / Subcategoría / Problema | `category` / `subcategory` / `problem` |
| Tipo de servicio | `service_type` |
| Prioridad | `priority` |
| Canal | `channel` |
| Solicitante | `requester` |
| Encargado de plataforma | `dispatcher` |
| Supervisor | `supervisor` |
| Técnico (de mantenimiento) | `technician` |
| Autorización | asignación del supervisor al técnico (`stage = 'supervisor'`) |
| Bloqueo / motivo de pausa | `blocker` |
| Bitácora | `ticket_events` |
| Evidencia | `attachment` |

Valores de enum en inglés (`on_hold`, `with_supervisor`…) con etiquetas en español en la interfaz.

## 11. Decisiones provisionales y preguntas abiertas

Decisiones provisionales (avanza con ellas; son reversibles y deben quedar en un ADR):

1. Un tiquet puede tener **varios bloqueos simultáneos**.
2. `on_hold` se **calcula** a partir de los bloqueos activos.
3. La **autorización** es la asignación del supervisor al técnico.
4. El solicitante puede ser un **usuario con cuenta o un contacto sin cuenta** (nombre y
   teléfono/extensión en el tiquet).
5. La prioridad la propone el solicitante y la pueden ajustar el encargado o el supervisor,
   con un evento en la bitácora.

Preguntas para la persona (regístralas en `docs/ESTADO.md` cuando la tarea dependa de ellas):

1. Lista inicial de tipos de bloqueo, sus subestados y campos adicionales.
2. ¿Los solicitantes tendrán cuenta en Axia o serán contactos sin cuenta?
3. Zona horaria de la institución y si hay horario laboral que afecte las métricas.
4. ¿Qué formato debe tener el número de tiquet (entero consecutivo, con prefijo o año)?
5. ¿Se requieren reglas de tiempo objetivo (SLA) por prioridad o tipo de servicio?
