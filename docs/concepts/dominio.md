# Axia — Dominio (núcleo)

Resumen conceptual del núcleo de Axia: flujo, roles, estados y glosario. No depende de ningún
sistema externo.

> **Fuente de verdad:** `docs/concepts/negocio.md`, aprobada por la institución. Este documento es un **resumen
> consistente**; si algo aquí contradice la especificación, manda la especificación. Antes de tocar
> flujo, estados, tiempos o permisos, debe leerse esa especificación.

Si algo es ambiguo o falta, **no se inventa**: se registra en `docs/internal/estado.md` y en las
preguntas abiertas de `docs/concepts/datos.md`.

## 1. Propósito

Dar seguimiento exacto a las solicitudes de mantenimiento (tiquets): en qué paso está cada una y,
si no avanza, **por qué** y en qué estado está ese motivo, con evidencia (foto o archivo) en cada
paso. Sobre todo, **medir**: tiempos, causas de retraso, calidad de la captura y carga de trabajo.
Multiusuario, con roles y permisos configurables; PWA de escritorio y móvil, con uso sin conexión
para los técnicos; autoalojada o en la nube, y open source.

Cada **instancia** es un despliegue con su propia configuración y catálogos. En una misma base
conviven varias dependencias solicitantes. Todo lo que dependa de la instancia es configurable:
catálogos, motivos, roles, permisos, políticas y hasta los nombres con que se muestran los
conceptos.

## 2. Roles y permisos (configurables)

- Los **roles son datos** (no código): un usuario puede tener varios. Se arman con un conjunto
  **fijo de permisos** del sistema más un **ámbito** (`propios`, `equipo`, `edificios`, `todos`).
- Roles semilla: **solicitante**, **supervisor**, **técnico** y **administrador**. El
  administrador puede todo y sustituye al antiguo "encargado de plataforma" (ese rol ya no existe).
- Los permisos nunca se leen de metadatos que el usuario pueda editar; se imponen en el servidor con `can`/`canAct` y acciones transaccionales.
- Un **solicitante** puede tener cuenta o ser un **contacto sin cuenta** (modelo mixto): en ese
  caso, sus acciones las ejerce quien tenga el permiso, **en su nombre** (ver §13).

## 3. Flujo de negocio (resumen)

```
Registro ─► Oferta a supervisores ─► Supervisor toma/asigna ─► Técnico revisa
(cobertura)   (candidatos por          (autoriza)                (captura, recaptura
               equipo y edificio)                                  o duplicado)

─► Evidencia "antes" ─► Inicia ─► [pausas con motivo] ─► Atendido (evidencia "después")
                                                              │
                     Reclamación ◄──── Validación (solicitante y/o supervisor)
                          │                        │
                    procede: reabre          cumplida: cerrado
```

El sistema **ofrece** el tiquet a los supervisores candidatos (los del **equipo** del tiquet que
cubren su **edificio**); cuando uno lo toma o asigna técnico, la oferta desaparece para los demás
(queda en el historial). Sin candidatos, va a la cola de administradores como "sin ruteo".

Reglas de negocio completas: `docs/concepts/negocio.md` §3 y §5 (RN-01 a RN-30).

## 4. Estados (lógica fija, no catálogo)

`registered` → `with_supervisor` → `assigned` → `in_progress` → `attended` → `closed`, con
`paused`, `under_claim` y los finales de descarte `rejected`, `cancelled` y `duplicate`.

Todo movimiento relevante es un **registro explícito del historial** (tipo, motivo, quién, cuándo
y duración); cambiar una columna no basta. Los cambios de estado ocurren **solo** por funciones
RPC de transición, que validan permiso, estado y precondiciones y escriben el historial en la
misma transacción. La matriz de transiciones se detalla en `docs/concepts/datos.md`.

**Concurrencia y acciones tardías:** "la primera es verdad". Una acción que llega tarde (sin
conexión) sobre un estado ya resuelto se **registra**, pero **no surte efecto**. Un tiquet
descartado (`rejected`, `cancelled`, `duplicate`) puede **reactivarse** por un administrador y
vuelve al estado que tenía **justo antes de descartarse**.

## 5. Captura y recaptura

- **Captura**: lo que registra quien crea el tiquet (edificio, ubicación, dependencia, categoría,
  subcategoría, problema, tipo de servicio, prioridad, descripción y contacto). **Mala captura**:
  captura incorrecta.
- **Recaptura**: corrección de la captura **sobre el mismo tiquet**; se conservan los valores
  originales y cada versión. Se **aplica** y se **avisa** al solicitante y al supervisor; **no hay
  aprobaciones**. Si la nueva captura deja al técnico fuera de su área, el tiquet vuelve al
  supervisor. Quien no esté de acuerdo **abre una reclamación**. Sirve para medir la **calidad de
  la captura**.
- La **foto al registrar** es **opcional pero muy recomendada** (política configurable; semilla:
  recomendada); el sistema invita a adjuntarla sin bloquear el registro.

## 6. Pausas y motivos jerárquicos

Cuando el tiquet no puede avanzar, se **pausa** eligiendo un **motivo del catálogo jerárquico**
(profundidad ilimitada) con subestados por los que avanza; cada paso queda registrado con su
fecha. Un tiquet tiene **como máximo una pausa abierta**. Los motivos (pausa, rechazo,
cancelación, reasignación, recaptura, reclamación y su resultado, reactivación, apoyo auxiliar…)
son **catálogo con activar/desactivar**, no código. Cada nodo puede definir si exige nota, si
admite fecha estimada y su **clasificación de reloj** (cómo cuenta para el tiempo).

## 7. Evidencias y bitácora

- Tipos de evidencia **fijos**: `request`, `before`, `during`, `after`, `claim`, `other`.
  `before` y `after` son **obligatorias en cada ciclo de atención**; `claim` en la reclamación.
- Cada evidencia cuelga del **evento** que la originó, con autor, fecha y metadatos.
  Almacenamiento privado con URL firmadas y límites de tipo y tamaño configurables. Nunca se
  borran.
- **Bitácora de solo agregar**: cada cambio de estado, asignación, pausa, recaptura, reclamación,
  comentario o evidencia genera un evento con actor, tipo, datos, origen y marcas de tiempo. El
  origen (`source`) distingue `app`, `import` o `integration` sin nombrar sistemas.

## 8. Catálogos

Administrables, con activar/desactivar en lugar de borrar. Todo lo que se use en un tiquet
**conserva el valor que tenía en ese momento** aunque el catálogo cambie después.

- **Maestros**: edificios → ubicaciones, dependencias, **equipos** (la categoría pertenece a un
  equipo), categorías → subcategorías → problemas, tipos de servicio, prioridades, canales de
  registro, **solicitantes** (con vínculo opcional a una cuenta) y **técnicos** (con vínculo
  opcional a una cuenta).
- **Motivos jerárquicos** por tipo de uso (ver §6).
- **Operación**: designación de técnicos a categorías, ámbito de supervisores (equipo y
  edificios), roles, permisos, reglas de notificación y escalamiento, políticas de tiempos
  objetivo y calendarios laborales.

## 9. Orígenes e integraciones (visión del núcleo)

- El núcleo no sabe de qué sistema vienen los datos importados. Solo conoce: el **canal** de
  registro del tiquet, `ticket_external_refs(ticket_id, system, external_id)` con
  `unique(system, external_id)` (`system` es texto validado por el catálogo `external_systems`) y
  eventos con `source = 'import'` o `'integration'`.
- Las integraciones son adaptadores **opcionales y aislados**. Esta versión no incluye ninguno; Axia se despliega y se usa sin ellos.

## 10. Tiempos

Los tiempos son un objetivo central. **Corren 24 horas** (calendario continuo), además de poder
medirse el **tiempo laboral** con jornadas configurables (turnos). El historial se guarda como
**tramos con inicio y fin**, y cada tramo copia la **clasificación de reloj** del momento en que
se creó (si el catálogo cambia después, el histórico no se altera). Los tramos pueden originarse
en el **sistema** (una transición) o capturarse **manualmente** (ver §13). Los indicadores se
**calculan** desde el historial, nunca se almacenan como cifras sueltas.

## 11. Indicadores

Con vistas o funciones, en versión calendario y laboral y **excluyendo duplicados** de los de
desempeño: tiempos de respuesta, asignación, reasignación, recaptura, inicio, trabajo y pausa,
validación, reclamación y reapertura; tasas de reasignación, recaptura, reapertura y reclamación;
cumplimiento de tiempos objetivo; carga por técnico y equipo; horas de apoyo auxiliar por persona
y categoría; antigüedad de pendientes; resolución a la primera; satisfacción; tiquets sin tomar o
sin ruteo; y los indicadores propios de duplicados. Definición de cada uno en
`docs/concepts/datos.md`.

## 12. Duplicados y enlaces entre tiquets

- **Detección al registrar**: alerta que **no bloquea**, mostrando datos del otro tiquet; se
  guarda qué candidatos se mostraron y qué decidió la persona.
- **Marcar duplicado**: cualquier persona que **participe en el flujo** del tiquet (solicitante
  sobre lo suyo, supervisores candidatos o que lo tomaron, técnico y auxiliares, administradores);
  exige enlazar al original. Un duplicado queda **cerrado y fuera de los indicadores de
  desempeño**; se **avisa al solicitante** y no se crea ninguna relación de seguidor.
- **Enlaces** entre tiquets: `duplicate_of`, `derived_from`, `related_to`, `blocked_by`.

## 13. Modelo mixto: cuentas, proxy y tiempos manuales

- **Solicitante**: del **catálogo de solicitantes**, con **vínculo opcional** a una cuenta. Un
  administrador (o quien tenga el permiso) registra **a nombre de** un solicitante sin cuenta; el
  tiquet guarda instantánea del contacto.
- **Técnico**: del **catálogo de técnicos**, con **vínculo opcional** a una cuenta. Puede existir
  sin cuenta; quien lleva el seguimiento ejecuta sus acciones y registra sus tiempos.
- **Proxy ("actuar en nombre de")**: el administrador puede actuar en nombre de cualquiera; el
  supervisor, sobre sus técnicos (asignados o auxiliares). El historial distingue siempre
  **actor** (quién lo hizo) de **sujeto** (a nombre de quién).
- **Tiempos manuales**: el supervisor o el administrador que lleva el seguimiento registra y
  corrige tramos a mano, con origen `manual`, autor y validaciones; las correcciones quedan como
  historial y no cuentan doble.

## 14. Glosario (negocio ↔ código)

| Español | Código |
|---|---|
| Tiquet | `ticket` |
| Folio legible / número consecutivo | `folio` / `ticket_number` |
| Captura / recaptura | `capture` / `recapture` |
| Edificio / Ubicación | `building` / `location` |
| Equipo (atiende) | `team` |
| Dependencia (solicita) | `dependency` |
| Categoría / Subcategoría / Problema | `category` / `subcategory` / `problem` |
| Tipo de servicio / Prioridad / Canal | `service_type` / `priority` / `channel` |
| Solicitante | `requester` |
| Técnico | `technician` |
| Auxiliar | `auxiliary` |
| Supervisor | `supervisor` |
| Administrador | `administrator` |
| Ciclo de atención | `care_cycle` |
| Pausa / motivo | `pause` / `reason` |
| Reclamación | `claim` |
| Evidencia | `evidence` |
| Bitácora | `ticket_events` |
| Tramo de tiempo | `time_span` |

Valores de enum y nombres de tabla/columna en inglés; etiquetas de interfaz en español (es-MX).

## 15. Decisiones y preguntas

- **Decisiones confirmadas** (además de las §14 de la especificación): modelo mixto de solicitante
  (catálogo con vínculo opcional), técnicos de catálogo con cuenta opcional, proxy para técnicos y
  solicitantes sin cuenta, tiempos manuales, **recaptura sin aprobación** (se aplica y se avisa;
  la disconformidad va por reclamación), **concurrencia "primero gana"**, **reactivación al estado
  previo al descarte**, **calificación siempre opcional** y **duplicados sin seguidores** (solo
  enlace y aviso). Detalle y ADR en `docs/concepts/datos.md`.
- **Preguntas abiertas**: quedan las de negocio de fases posteriores (zona horaria y horario,
  tiempos objetivo), registradas en `docs/internal/estado.md`. No se resuelven en silencio.
