# Tarea: Fase 1 — modelo de datos del núcleo de Axia

Vas a diseñar e implementar la base de datos del núcleo de Axia a partir de la especificación de
negocio de este documento. **No te digo cómo modelar cada tabla**: te cuento el negocio, las reglas
y lo que necesito medir, y tú diseñas. Lo que sí es obligatorio está en las secciones 5, 12 y 15.

**Vocabulario:** no uses las palabras "tipificar", "tipificación" ni "re-tipificación" en nombres,
textos ni documentación. El concepto correcto es **captura** (lo que se registra al crear el tiquet),
**mala captura** (captura incorrecta) y **recaptura** (corregir la captura sobre el mismo tiquet).

## 0. Cómo debes trabajar

1. **Primero, documentación.** Guarda las secciones 1 a 14 de este documento, sin recortarlas, como
   `docs/especificacion-negocio.md` (fuente de verdad del negocio). Actualiza `docs/dominio.md`
   para que sea consistente con ella (elimina lo que contradiga: rol `dispatcher`, "bloqueos" como
   entidad aparte, tiquet sustituto) y remita a ese archivo. Añade la especificación a la lista de
   documentos de `AGENTS.md` (sección 11) con la regla de leerla antes de tocar flujo, estados,
   tiempos o permisos. Ajusta la hoja de ruta de `docs/ESTADO.md`.
2. **Punto de control obligatorio.** Antes de escribir ninguna migración, entrega
   `docs/modelo-datos.md` (sección 15) y **detente** para que yo lo apruebe. Yo no reviso código:
   este documento es mi revisión de negocio. Si algo de la especificación es ambiguo, contradictorio
   o te parece un riesgo, no lo resuelvas en silencio: ponlo en la sección de preguntas del documento.
3. **Después de mi aprobación**, implementa por tramos pequeños (sección 15), cada uno con sus
   pruebas pgTAP y `pnpm check` en verde.
4. Trabaja solo con la base **local** (`pnpm db:reset`). No apliques nada a otros entornos salvo que
   yo lo pida explícitamente.
5. No hay interfaz en esta fase. Sí debes dejar la base lista para que la interfaz y las notificaciones
   se construyan encima sin rehacer el esquema: el objetivo es que las migraciones posteriores sean
   pequeñas y básicas.
6. Respeta `AGENTS.md` y `docs/convenciones-codigo.md` (idioma de nombres, RLS en todo, transiciones
   solo por RPC, historial de solo agregar, núcleo agnóstico de plataformas externas).

## 1. Qué es Axia

Plataforma propia de seguimiento de solicitudes de mantenimiento. Cada solicitud (tiquet) tiene en todo
momento un estado exacto y, si no avanza, el motivo y el estado de ese motivo, con evidencia
fotográfica en cada paso. Sirve para atender mejor y, sobre todo, para **medir**: tiempos, causas de
retraso, calidad de captura y carga de trabajo. Es multiusuario, con roles y permisos configurables.

Cada **instancia** es un despliegue con su propia configuración y catálogos. En una misma base conviven
varias dependencias solicitantes (no es multiinstitución dentro de una base). Todo lo que pueda
depender de la instancia debe ser configurable: catálogos, motivos, subestados, roles, permisos,
políticas y hasta los nombres con que se muestran los conceptos.

## 2. Glosario y roles

| Concepto | Significado |
|---|---|
| **Equipo** (`team`) | Grupo que atiende: mantenimiento, seguridad, etc. Cada instancia lo puede llamar departamento, jefatura, área o como quiera (etiqueta configurable). La **categoría pertenece a un equipo** |
| **Dependencia** (`dependency`) | Unidad que solicita. **No es lo mismo que el equipo** |
| Edificio / Ubicación | Dónde ocurre el problema; la ubicación pertenece a un edificio |
| Categoría → Subcategoría → Problema | Clasificación jerárquica de tres niveles |
| **Captura** | Lo que registra quien crea el tiquet. **Mala captura**: captura incorrecta. **Recaptura**: corrección de la captura sobre el mismo tiquet, conservando lo original |
| Solicitante | Quien registra el tiquet (cualquier usuario con permiso; todos tienen cuenta) |
| Supervisor | Pertenece a **un solo equipo** (por ahora) y cubre **uno o varios edificios** |
| Técnico | Pertenece a un equipo y está **designado** a ciertas categorías |
| Auxiliar | Cualquier técnico o supervisor que apoya en un tiquet |
| Seguidor | Persona que recibe avisos de un tiquet sin ser parte de la cadena de atención |
| Administrador | Puede hacer todo en la plataforma; sustituye al antiguo "encargado de plataforma" |
| Ciclo de atención | Cada vuelta de trabajo de un tiquet; una reapertura inicia un ciclo nuevo |

**Roles y permisos:** los roles son datos configurables, no código. Un usuario puede tener varios.
Los **permisos son un conjunto fijo definido por el sistema** (capacidades como crear, tomar, asignar,
iniciar, pausar, validar, reclamar, reabrir, rechazar, cancelar, marcar duplicado, ver por ámbito,
administrar catálogos, usuarios y roles), y los roles se arman asignándoles permisos y un ámbito
(propios, equipo, edificios, todos). Roles semilla: solicitante, supervisor, técnico y administrador.
Diseña la matriz de permisos y propónmela. Por ahora, "alguien superior a un técnico" es quien puede
validar, reclamar y reabrir.

## 3. Flujo de negocio paso a paso

1. Un usuario registra el tiquet usando los catálogos y llena **todos los campos**. La evidencia
   fotográfica es **opcional pero muy recomendada** en este paso (el sistema debe invitar a adjuntarla). Si el sistema detecta un **posible duplicado**, lo avisa
   (con datos del otro tiquet) y el usuario puede, aun así, registrarlo.
2. El sistema lo **ofrece a los supervisores candidatos**: los del equipo del tiquet que cubren su
   edificio. Si hay varios, se ofrece a todos.
3. Cuando uno decide cómo seguir (lo toma o asigna técnico), **la oferta desaparece para los demás**
   (queda en el historial).
4. Si el tiquet llegó al supervisor equivocado (mala captura), este lo **reasigna** a otro equipo o
   supervisor. Es un movimiento explícito con motivo. El supervisor receptor corrige la captura. El
   tiempo perdido hasta darse cuenta se mide aparte como **tiempo de reasignación**.
5. El supervisor **asigna técnico**. Cada categoría tiene técnicos designados, pero puede asignar a
   cualquier otro técnico o supervisor; si la persona no está designada para esa categoría, cuenta
   como **apoyo auxiliar** en esa categoría.
6. El técnico **revisa** la captura y la descripción. Si están mal, **propone una recaptura** sobre el
   **mismo tiquet**: se conservan los datos originales y cada versión. Supervisor y solicitante
   reciben alerta y **deben estar de acuerdo**. Si tras el cambio el técnico ya no corresponde al área
   (y no es auxiliar), el tiquet vuelve al supervisor, que reasigna. Si en la revisión detecta que es
   un **duplicado**, lo marca (paso 12).
7. El técnico toma la **evidencia "antes"** al llegar e inicia el trabajo.
8. Durante el trabajo el tiquet puede **pausarse** con un motivo jerárquico (por ejemplo: material →
   solicitado → en cotización → compra externa → recibido).
9. Al terminar, el técnico lo marca **atendido** con descripción del trabajo y evidencia **"después"**.
10. El tiquet queda **pendiente de validación** por el supervisor y/o el solicitante (según la política
    de la instancia). Al validarse, pasa a **cerrado**.
11. Si no están conformes, pueden abrir una **reclamación** (con evidencia del porqué). Un supervisor la
    evalúa y, al hacerlo, deja bien capturado el tiquet. Si **procede**, se **reabre** (vuelve al mismo
    técnico salvo que el supervisor cambie la asignación) y el tiempo sigue corriendo. Si **no procede**,
    el tiquet queda **cerrado**. También puede resultar en **un tiquet nuevo** porque lo pedido es otra
    cosa.
12. En cualquier momento, quienes tengan permiso pueden **marcar un duplicado** (queda cerrado y
    enlazado al original), **rechazar** o **cancelar** con motivo.

## 4. Estados

Los estados son **lógica de negocio fija** (no son catálogo). Los motivos y subestados sí son catálogo.

| Código sugerido | Etiqueta | Significado |
|---|---|---|
| `registered` | Registrado | Creado y ofrecido a supervisores candidatos; nadie lo ha tomado |
| `with_supervisor` | Con supervisor | Un supervisor lo tomó y decide o asigna técnico |
| `assigned` | Asignado (sin atender) | Técnico asignado; aún no inicia |
| `pending_recapture` | Recaptura por aprobar | El técnico propuso cambios y esperan aprobación |
| `in_progress` | En proceso | Trabajo iniciado |
| `paused` | Pausado | No puede avanzar; lleva motivo y subestados |
| `attended` | Atendido | El técnico terminó; pendiente de validación |
| `under_claim` | En reclamación | Hay una reclamación abierta |
| `closed` | Cerrado | Validado y finalizado |
| `rejected` | Rechazado | Descartado, con motivo |
| `cancelled` | Cancelado | Cancelado, con motivo |
| `duplicate` | Duplicado | Es repetido de otro tiquet; cerrado y enlazado al original |

Los códigos y etiquetas son una propuesta: puedes ajustarlos si mantienes la semántica y me lo
explicas. **Todo movimiento relevante** (reasignación, recaptura, apoyo auxiliar, pausa y sus pasos,
reclamación, reapertura, validación, rechazo, cancelación, duplicado) debe quedar como **registro
explícito y consultable del historial** con tipo, motivo, quién, cuándo y duración; no basta con
cambiar una columna. Diseña la matriz completa de transiciones: estado origen, acción, quién puede,
precondiciones y efectos.

## 5. Reglas de negocio

- **RN-01 Registro.** Campos obligatorios: edificio, ubicación, dependencia solicitante, categoría,
  subcategoría, problema, tipo de servicio, prioridad, descripción y contacto (nombre y extensión o
  teléfono, tomados del perfil y editables). Evidencia de tipo `request`: opcional pero muy recomendada (ver sección 8). Antes de confirmar el
  registro se aplica la detección de posibles duplicados (RN-29).
- **RN-02 Equipo del tiquet.** Se deriva de la categoría y se guarda como instantánea en el tiquet
  (la categoría podría cambiar de equipo después sin alterar el historial).
- **RN-03 Ruteo.** Candidatos = supervisores activos del equipo del tiquet cuyo ámbito incluye su
  edificio. Se genera una oferta por candidato. Sin candidatos: el tiquet va a la cola de
  administradores como "sin ruteo" y genera alerta.
- **RN-04 Ámbito del supervisor.** Un equipo por supervisor por ahora y varios edificios. Modela la
  relación para que permitir varios equipos a futuro no exija rediseñar (restricción relajable).
- **RN-05 Tomar.** Al tomar un candidato (o al asignar técnico, lo cual implica tomar), se retiran las
  ofertas de los demás conservándolas en el historial, y pasa a `with_supervisor`.
- **RN-06 Reasignación de supervisor.** Solo quien tiene el tiquet (o un administrador). Destino: otro
  equipo (se recalculan candidatos) o un supervisor concreto. Motivo obligatorio (catálogo) y nota
  opcional. Vuelve a `registered` para el nuevo destinatario. Su tiempo se clasifica como
  **reasignación**.
- **RN-07 Asignación de técnico.** Solo el supervisor o un administrador. Si la persona no está
  designada para la categoría del tiquet, su participación cuenta como **apoyo auxiliar** en esa
  categoría. Pueden agregarse auxiliares adicionales (técnicos o supervisores).
- **RN-08 Reasignación de técnico.** Siempre por el supervisor o un administrador, con motivo. El
  técnico puede devolver el tiquet al supervisor con motivo, pero no elige sustituto.
- **RN-09 Tiempo de participación.** Cada participante (líder o auxiliar) tiene registro de inicio,
  fin y duración por tiquet y por categoría, para demostrar cuántas horas apoyó cada persona en cada
  categoría y alimentar las métricas.
- **RN-10 Revisión del técnico.** Antes de iniciar, el técnico confirma la captura, propone una
  recaptura o marca un duplicado.
- **RN-11 Recaptura.** Modifica el **mismo** tiquet; no se crea otro. Se conservan los valores
  originales y cada versión (campos antes y después, quién, cuándo, motivo del catálogo). Si la
  propone el técnico: estado `pending_recapture` y la deben aceptar el supervisor y el solicitante
  (política configurable), con alertas a ambos. Aceptada: se aplican los cambios; si el técnico ya no
  corresponde (la nueva categoría no es de su área y no es auxiliar) vuelve al supervisor
  (`with_supervisor`, o `registered` hacia otro equipo si cambió el equipo o el edificio); si
  corresponde, vuelve a `assigned`. Rechazada: se conserva lo original, vuelve a `assigned` y el
  supervisor decide cómo seguir. Si la hace un supervisor (incluida la que hace al revisar una
  reclamación): se registra y se notifica al solicitante, sin aprobación. Es la forma de medir la
  calidad de la captura (quién se equivoca y en qué).
- **RN-12 Inicio.** Solo con evidencia `before` del ciclo de atención actual (tomada cuando el técnico
  llega). Pasa a `in_progress`.
- **RN-13 Pausa.** La inician técnico, supervisor o administrador. Elige un nodo del catálogo
  jerárquico de motivos (niveles ilimitados), con nota y fecha estimada opcionales. Mientras dura puede
  avanzar de subestado y cada paso queda registrado con su fecha. Se reanuda a `in_progress`. Un
  tiquet tiene como máximo **una pausa abierta**; modélalo de forma que relajar esa regla no exija
  rediseño.
- **RN-14 Atendido.** El técnico lo marca con descripción del trabajo y evidencia `after` del ciclo.
- **RN-15 Validación.** Política de la instancia (no por tiquet): solo solicitante, solo supervisor, o
  ambos en cualquier orden. Opcionalmente, validación automática tras N días sin respuesta (**apagada
  por defecto**). Cumplida la política, pasa a `closed`. El solicitante puede dejar calificación de
  satisfacción (1 a 5) y comentario.
- **RN-16 Reclamación.** La pueden abrir el solicitante, un supervisor o un administrador, **nunca el
  técnico**, mientras el tiquet esté `attended` o dentro de la ventana configurable posterior a
  `closed` (**en la semilla, 1 día**). Requiere motivo (catálogo), descripción y evidencia `claim`. Pasa
  a `under_claim` y notifica al supervisor.
- **RN-17 Evaluación de la reclamación.** La resuelve un supervisor o un administrador, con notas
  internas y un resultado del catálogo, y al hacerlo deja el tiquet **bien capturado** (RN-11):
  - **Procedente:** se reabre (RN-18).
  - **Improcedente:** el tiquet queda **`closed`**. Si venía de `closed`, simplemente vuelve a ese
    estado; si venía de `attended`, esta resolución lo cierra sin pedir otra validación y así queda
    registrado.
  - **Requiere tiquet nuevo:** se cierra la reclamación, el tiquet vuelve a su estado previo y se
    crea uno nuevo enlazado (`derived_from`).
- **RN-18 Reapertura.** Inicia un **nuevo ciclo de atención**. El tiquet vuelve a `assigned` con **el
  mismo técnico**, salvo que el supervisor haya cambiado la asignación (o la captura de modo que el
  técnico ya no corresponda) durante la revisión de la reclamación. Lo anterior queda como historial y
  el tiempo sigue corriendo. En el ciclo nuevo se exigen de nuevo evidencias `before` y `after`.
- **RN-19 Rechazo.** Técnico (en revisión o trabajo), supervisor o administrador, con motivo jerárquico
  y texto libre opcional. La mala captura **no** es motivo de rechazo (se hace recaptura) y el
  duplicado tampoco (tiene su propio estado, RN-29).
- **RN-20 Cancelación.** Por roles con permiso (por defecto técnico, solicitante sobre sus propios
  tiquets, supervisor y administrador), con motivo jerárquico y texto opcional. Los permisos y las
  condiciones (por ejemplo, el solicitante solo antes de `in_progress`) son configurables.
- **RN-21 Escalamiento y alertas.** Reglas configurables: tiquet sin tomar tras N tiempo, sin técnico
  tras N tiempo, sin supervisor candidato, y cercanía o incumplimiento de un tiempo objetivo.
- **RN-22 Nada se borra.** El historial es de solo agregar; los tiquets solo cambian de estado; los
  catálogos se desactivan.
- **RN-23 Visibilidad.** Las notas son **internas**. El solicitante ve lo relevante (cambios de estado,
  pausas a nivel de motivo, atendido y solicitud de validación, reclamaciones, recaptura propuesta).
  Define y documenta qué tipos de evento son visibles al solicitante, configurable por tipo.
- **RN-24 Enlaces entre tiquets.** Tipos: duplicado de, derivado de, relacionado con, bloqueado por.
- **RN-25 Folio.** Cada tiquet tiene un identificador interno no secuencial (UUID), un **número
  consecutivo global** para contar y ordenar, y un **folio legible** formado con un patrón
  configurable (por defecto prefijo + consecutivo, con año opcional). No uses `max(número)` para
  contar tiquets. El folio nunca cambia.
- **RN-26 Roles configurables.** Ver sección 2.
- **RN-27 Trabajo sin conexión.** Los técnicos operan sin señal. Toda acción lleva un identificador
  único del cliente (idempotente) y el historial guarda **cuándo ocurrió** (`occurred_at`, reportado por
  el cliente, con validaciones) y **cuándo se registró** (`recorded_at`, del servidor). Define cómo se
  resuelven acciones que llegan tarde o en conflicto (por ejemplo, el tiquet ya cambió de estado).
- **RN-28 Prioridad.** La propone el solicitante y la pueden ajustar el supervisor o el administrador,
  con historial.
- **RN-29 Duplicados.**
  - **Detección al registrar:** antes de confirmar, el sistema busca posibles duplicados entre tiquets
    no finales (por ejemplo: misma ubicación y problema, texto similar, ventana de tiempo). Si los
    encuentra, **avisa y muestra** datos del otro tiquet para que la persona hable con quien lo
    registró o recuerde que ya lo había hecho (puede ser ella misma). **No bloquea**: puede registrarlo
    igualmente. Se guarda qué candidatos se mostraron y qué decidió la persona, y el tiquet queda
    marcado como **posible duplicado** para los revisores.
  - **Marcar duplicado:** puede hacerlo **cualquier persona que participe en el flujo del tiquet**: el
    solicitante (sobre sus propios tiquets), los supervisores a quienes se ofreció o que lo tomaron, el
    técnico y los auxiliares asignados, y los administradores. Es un permiso configurable que por
    defecto se concede a todos ellos; quien no participa en el tiquet no puede marcarlo. Exige enlazar
    al tiquet original (`duplicate_of`). El tiquet pasa a `duplicate` (final).
  - **Efectos:** el solicitante del duplicado queda como **seguidor** del original y se le avisa.
  - **Tiempos:** un duplicado **no cuenta** en los indicadores de desempeño (respuesta, asignación,
    resolución, cumplimiento de tiempos objetivo ni carga de trabajo). Solo se mide aparte el **tiempo
    de revisión del duplicado** (registro → marcado) y se cuentan en indicadores propios.
  - Qué datos del otro tiquet se muestran en la alerta (por ejemplo, el contacto de quien lo registró)
    es configurable.
- **RN-30 Reactivación.** Un administrador puede reactivar un tiquet en estado final de descarte
  (`rejected`, `cancelled` o `duplicate`), con motivo; queda en el historial y se evalúa cómo se tratan
  sus tiempos.

## 6. Catálogos configurables

**Todo es catálogo, excepto los estados de la sección 4** y las constantes del sistema (tipos de
evidencia y tipos de participación). Los catálogos se desactivan, no se borran. Lo que se use en un
tiquet debe conservar el valor que tenía en ese momento aunque el catálogo cambie después.

- **Maestros:** edificios, ubicaciones, equipos, dependencias, categorías (de un equipo), subcategorías,
  problemas, tipos de servicio, prioridades, canales de registro.
- **Motivos jerárquicos (profundidad ilimitada, por tipo de uso):** pausa, rechazo, cancelación,
  reasignación de supervisor, reasignación de técnico, recaptura, reclamación, resultado de
  reclamación, reactivación y tipo de apoyo auxiliar. Cada nodo puede tener: activo, orden,
  **clasificación de reloj** (sección 7), si exige nota y si admite fecha estimada.
- **Operación:** designación de técnicos a categorías, ámbito de supervisores (equipo y edificios),
  roles, permisos, reglas de notificación y escalamiento, políticas de tiempo objetivo, calendarios
  laborales.

**Semillas (datos ficticios, editables), a cargar en `seed.sql`:**

- **Pausa:** *Falta de material* (por solicitar → solicitado → en cotización → cotización aprobada →
  compra externa o salida de almacén → en tránsito → recibido); *Falta de personal* (sin técnico
  disponible, técnico no capacitado, requiere especialista); *Proveedor o contratista externo* (por
  contactar, contactado, visita agendada, en garantía); *Acceso al área* (sin acceso, área ocupada,
  esperando al solicitante, fuera de horario permitido); *Autorización* (esperando aprobación de
  presupuesto, esperando aprobación de dirección); *Herramienta o equipo especial* (por conseguir, en
  renta o préstamo); *Condiciones externas* (clima, falla de servicios); *Dependencia de otro tiquet*;
  *Esperando información del solicitante*; *Programado* para fecha acordada.
- **Rechazo:** fuera de alcance o no corresponde a mantenimiento; información insuficiente; no se pudo
  reproducir la falla; responsabilidad de otra área o proveedor; requiere proyecto u obra mayor; sin
  autorización o presupuesto; solicitud improcedente.
- **Cancelación:** a petición del solicitante; creado por error; ya no es necesario; se resolvió por
  otro medio; sin respuesta del solicitante; decisión administrativa.
- **Reasignación de supervisor:** equipo incorrecto; edificio incorrecto; categoría incorrecta; falta de
  competencia; ausencia o carga de trabajo. **Reasignación de técnico:** ausencia, carga de trabajo,
  falta de competencia, solicitud del técnico.
- **Recaptura:** categoría o subcategoría mal capturada; edificio o ubicación mal capturados; tipo de
  servicio mal capturado; prioridad mal capturada; descripción insuficiente.
- **Reclamación:** trabajo incompleto; la falla persiste o regresó; calidad deficiente; no corresponde a
  lo solicitado; daño colateral o falta de limpieza. **Resultado:** procedente; improcedente; requiere
  tiquet nuevo.
- **Reactivación:** error al descartar; nueva información; decisión administrativa.
- **Apoyo auxiliar:** cobertura de ausencia; trabajo que requiere más de una persona; apoyo por carga
  de trabajo; apoyo de otra área.
- **Tipos de servicio:** correctivo, preventivo (solicitud puntual), inspección, mejora o instalación,
  emergencia. **Prioridades:** urgente, alta, media, baja, con tiempos objetivo de ejemplo.
- **Datos de ejemplo:** dos equipos (mantenimiento y seguridad) con categorías, un par de edificios y
  ubicaciones, roles con permisos, un calendario laboral y la configuración por defecto (con la
  **ventana de reclamación en 1 día** y la validación automática apagada).

## 7. Tiempos

Los tiempos son un objetivo central. **Corren 24 horas** (calendario continuo) porque un tiquet puede
durar días y eso debe verse. Además debe poder medirse el **tiempo laboral** según jornadas
configurables (hay técnicos por turnos): calendarios con intervalos semanales, días no laborables y
zona horaria, asignables al equipo por defecto y, si hace falta, a una persona o turno.

El historial se registra como **tramos con inicio y fin**, y cada tramo guarda una **clasificación de
reloj** copiada en el momento en que se creó (si el catálogo cambia después, el histórico no se altera).
Tramos que deben poder distinguirse:

| Tramo | De qué a qué |
|---|---|
| Respuesta del supervisor | Registro → tomado |
| Reasignación | Tiempo con un supervisor equivocado hasta que reasigna (**aparte**) |
| Asignación de técnico | Tomado → técnico asignado |
| Recaptura | Propuesta → resuelta |
| Espera de inicio | Técnico asignado → en proceso |
| Trabajo activo | En proceso, sin contar pausas |
| Pausa | Por motivo y subestado |
| Validación | Atendido → cerrado o reclamación |
| Reclamación y reapertura | Reclamación abierta → resuelta (**aparte**, pero suma al total) |
| Revisión de duplicado | Registro → marcado como duplicado (**aparte**, fuera de los indicadores de desempeño) |

**Tiempo total** = continuo desde el registro hasta el cierre final, **incluidas** reasignaciones,
recapturas, pausas, reclamaciones y reaperturas. Debe poder obtenerse también el **tiempo neto**
(excluyendo lo que se clasifique como no contable) y cada tramo por separado, en versión calendario y
en versión laboral. Los tiempos objetivo por prioridad y tipo de servicio se definen sobre el modo de
reloj que se elija. **Los duplicados quedan fuera de los indicadores de desempeño.** **Nada de esto se
almacena como cifras sueltas**: se calcula desde el historial. Documenta con ejemplos numéricos
resueltos al menos: caso simple, reasignación, recaptura, pausa con cambio de subestado, reclamación
con reapertura y duplicado.

## 8. Evidencias

- Tipos fijos: `request` (opcional al registrar), `before`, `during` (opcional), `after`, `claim`, `other`.
- **Obligatorias en cada ciclo de atención:** `before` (tomada cuando el técnico llega, para poder
  iniciar) y `after` (para poder marcar atendido).
- **Reclamación:** exige evidencia `claim` que muestre por qué se reclama. Si se reabre, el ciclo nuevo
  exige de nuevo `before` y `after`, y todo lo anterior se conserva como historial.
- La evidencia de tipo `request` (al registrar) es **opcional pero muy recomendada**: el sistema debe
  invitar a adjuntarla, sin bloquear el registro. La de tipo `during` es opcional.
- Cada evidencia cuelga del evento que la originó, con autor, fecha y metadatos. Almacenamiento
  privado, con límites de tipo y tamaño configurables. Nunca se borran.

## 9. Notificaciones

Son obligatorias. En esta fase solo se diseña y registra la base de datos; el envío (push, correo) se
construye después. Debe soportar: notificaciones por destinatario con lectura, reglas configurables
(tipo de evento → quién recibe → por qué canal), alertas de escalamiento, seguidores de un tiquet, y
los avisos que menciona la especificación (oferta a supervisores, reasignación, recaptura propuesta,
posible duplicado y duplicado marcado, atendido pendiente de validación, reclamación, reapertura,
rechazo, cancelación, tiquet sin tomar). Debe ser posible consultar no leídas y suscribirse a cambios
en tiempo real.

## 10. Configuración de la instancia

Tabla de configuración con, al menos: etiquetas de terminología (cómo se llama "equipo"), política de
validación (solicitante, supervisor o ambos), días de validación automática (apagado por defecto),
ventana de reclamación (semilla: 1 día), política de aprobación de recaptura, umbrales de
escalamiento, parámetros de detección de duplicados (ventana de tiempo, umbral de similitud y qué datos
del otro tiquet se muestran), patrón de folio, zona horaria, calendario laboral por defecto, si la
calificación es obligatoria, la política de evidencia al registrar (opcional, recomendada u
obligatoria; semilla: recomendada) y la lista de eventos visibles al solicitante.

## 11. Indicadores que la base debe poder calcular

Con vistas o funciones (calendario y laboral; **excluyendo duplicados** de los de desempeño): tiempo de
respuesta del supervisor; tiempo de asignación; tiempo perdido por reasignación; tasa de reasignación y
de recaptura (por solicitante, dependencia, equipo y categoría: calidad de la captura); tiempo hasta
inicio; tiempo de trabajo activo frente a pausado; pausas por motivo y subestado; tiempo total y neto;
tasa de reapertura, de reclamaciones y de reclamaciones procedentes; tiempo de validación; rechazos y
cancelaciones por motivo; cumplimiento de tiempos objetivo; carga por técnico y por equipo; **horas de
apoyo auxiliar por persona y categoría**; antigüedad de pendientes (*aging*); resolución a la primera
(sin reapertura); satisfacción promedio; tiquets sin tomar o sin ruteo; porcentaje de tiquets registrados sin evidencia de solicitud y su
relación con recapturas, reasignaciones y tiempos. **De duplicados:** tasa de
duplicados (por solicitante, dependencia, ubicación y equipo), tiempo hasta marcarse, alertas de
posible duplicado ignoradas frente a atendidas, y volumen con y sin duplicados. Propón los que falten
y los índices necesarios.

## 12. Requisitos transversales

- **Seguridad:** RLS en todas las tablas con políticas por rol y ámbito; los permisos salen de los
  datos (roles y permisos configurables), nunca de metadatos editables por el usuario. La alerta de
  duplicados no debe exponer más información de la que la configuración permita.
- **Transiciones solo por RPC** que validen permiso, estado, precondiciones (evidencias requeridas,
  motivos, etc.) y escriban el historial en la misma transacción. Idempotentes.
- **Concurrencia:** dos supervisores que toman a la vez; dos validaciones simultáneas; acciones
  tardías sin conexión. Define y prueba el comportamiento.
- **Integridad:** restricciones de base de datos para todo lo que pueda garantizarse ahí.
- **Auditoría:** historial inmutable; ningún borrado físico en datos de negocio.
- **Rendimiento:** índices para las consultas previsibles (bandejas por rol, listas por estado,
  antigüedad, métricas y búsqueda de posibles duplicados; puedes apoyarte en extensiones de Postgres
  disponibles en Supabase, como `pg_trgm`, justificándolo en un ADR).
- **Agnóstico:** nada del núcleo menciona plataformas externas. Conserva `ticket_external_refs`
  genérico para integraciones futuras.
- **Pruebas pgTAP** de: cada transición válida e inválida, cada permiso, ruteo y retiro de ofertas,
  recaptura (con y sin cambio de equipo), pausa con subestados, reclamación (procedente e improcedente
  desde `attended` y desde `closed`) y reapertura, detección y marcado de duplicados y su exclusión de
  indicadores, cálculo de tiempos con los ejemplos de la sección 7, visibilidad al solicitante, seeds
  válidos e idempotentes.
- **Datos:** todos los de ejemplo son ficticios.

## 13. Fuera de alcance en esta fase

Interfaz de usuario; envío real de notificaciones; mantenimiento preventivo recurrente; control de
materiales, inventario y costos (solo importa el estado de lo solicitado, que ya cubren los subestados
de pausa); equipos o activos; importación de datos y adaptadores de integración (fase de
integraciones). La detección de duplicados **sí** entra, como alerta que no bloquea; no se
fusionan tiquets.

## 14. Decisiones confirmadas y supuestos

**Ya confirmadas por mí (no las cuestiones, salvo que veas un riesgo):**

1. La reapertura devuelve el tiquet al mismo técnico, salvo que el supervisor lo cambie al revisar la
   reclamación.
2. La ventana de reclamación es configurable y la semilla es de **1 día**.
3. Una reclamación improcedente deja el tiquet cerrado.
4. La validación automática está apagada por defecto.
5. Hay una sola pausa abierta por tiquet.
6. Los duplicados se detectan al registrar (alerta que no bloquea) y los puede marcar cualquier persona
   dentro del flujo del tiquet; quedan cerrados, enlazados y fuera de los indicadores de desempeño.
7. Evidencias obligatorias: `before` y `after` por ciclo, y `claim` en la reclamación.
8. La foto al registrar el tiquet es opcional pero muy recomendada.

**Supuestos tuyos por confirmar (márcalos o cuestiónalos en las preguntas):**

1. La recaptura del técnico requiere aceptación de supervisor **y** solicitante, configurable; si
   alguien la rechaza, decide el supervisor.
2. El calendario laboral se asigna por equipo por defecto, con posibilidad de calendario propio por
   persona o turno.
3. El técnico pertenece a un equipo y está designado a categorías.
4. Todos los usuarios que registran tiquets tienen cuenta.
5. Los tiquets importados o históricos quedan fuera de esta fase.
6. Un administrador puede reactivar un tiquet descartado (RN-30).
7. Una reclamación improcedente sobre un tiquet que venía de `attended` lo cierra sin pedir otra
   validación.
8. En la alerta de duplicados se muestran por defecto folio, estado, fecha, ubicación, problema y
   contacto de quien lo registró (configurable).

## 15. Entregables y orden de trabajo

### Etapa A: documento de diseño (y detente)

Entrega `docs/modelo-datos.md` con:

1. Diagrama entidad-relación (Mermaid) y lista de tablas con columnas, tipos, claves y restricciones.
2. Enumeraciones y qué es fijo frente a configurable.
3. Diagrama de estados y **matriz de transiciones** (origen, acción, quién, precondiciones, efectos).
4. **Matriz de permisos** por rol semilla y ámbitos.
5. Algoritmo de ruteo y manejo de ofertas, y criterios de detección de posibles duplicados.
6. Modelo de tiempos, con los ejemplos numéricos resueltos de la sección 7.
7. Estrategia de RLS y de visibilidad al solicitante.
8. Lista de semillas.
9. Definición de cada indicador de la sección 11.
10. Decisiones tomadas (con ADR en `docs/decisions/`), riesgos y **preguntas abiertas para mí**.
11. Plan de migraciones por tramos.

Termina con un informe corto y **espera mi aprobación**.

### Etapa B: implementación por tramos (solo tras mi aprobación)

Tramos sugeridos, cada uno con pgTAP y `pnpm check` en verde, y un commit propio:

1. Configuración de la instancia, catálogos maestros y motivos jerárquicos.
2. Usuarios, perfiles, roles, permisos y ámbitos (equipo, edificios, categorías).
3. Tiquets, folio, historial, participantes, seguidores y evidencias.
4. Ruteo, ofertas, detección de posibles duplicados y transiciones del flujo (RPC).
5. Pausas, recaptura, reclamaciones, reapertura, duplicados y reactivación.
6. Tiempos: calendarios, tramos y funciones de cálculo.
7. Notificaciones, reglas y escalamiento.
8. RLS completa, visibilidad, semillas y vistas de indicadores.

Al terminar cada tramo: actualiza `docs/ESTADO.md`, entrega el informe final de `AGENTS.md` y continúa con
el siguiente solo si no depende de una pregunta mía sin responder.

## 16. Criterios de aceptación de la Fase 1

- `pnpm db:reset` reconstruye todo desde cero con semillas, y `pnpm check` está en verde.
- Cada regla RN-01 a RN-30 tiene al menos una prueba que la cubre.
- Un tiquet puede recorrer el flujo completo (registro con alerta de duplicado, ruteo, asignación,
  recaptura, inicio, pausa con subestados, atendido, validación, reclamación, reapertura y cierre) y el
  caso de duplicado, usando solo las funciones expuestas, y el historial permite reconstruir cada tramo
  de tiempo.
- Los indicadores de la sección 11 se pueden consultar con los datos de ejemplo.
- La documentación (`dominio`, `especificacion-negocio`, `modelo-datos`, ADR, `ESTADO`) está al día y
  no usa las palabras "tipificar", "tipificación" ni "re-tipificación".
