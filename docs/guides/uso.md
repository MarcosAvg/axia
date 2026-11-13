# Usar Axia

Entra con tu cuenta. Si recibiste una contraseña temporal, cámbiala cuando se solicite.
El menú muestra las secciones disponibles para tus permisos y perfil.

## Panel

El **Panel** es una bandeja accionable. Arriba muestra las cifras que requieren atención y cada una
abre la lista correspondiente: ofertas, por validar, en pausa, sin asignar o SLA. Después aparecen
tus bandejas —ofertas para ti, mi trabajo y tiquets del equipo—, la actividad reciente y, al final,
el resumen de volumen si tienes permiso de métricas. Las personas con varios roles ven las bandejas
de todos sus roles, no solo las del rol principal.

## Registrar una solicitud

1. Abre **Tiquets → Nuevo tiquet**.
2. Revisa el solicitante. Si tiene dependencia, la dependencia queda fija y solo aparecen los
   edificios y ubicaciones vinculados a ella. Si no tiene, selecciona edificio, ubicación y
   dependencia; las dependencias disponibles dependen de la ubicación. Elige categoría,
   subcategoría y problema; el problema determina el equipo que atiende.
3. Revisa el solicitante y su contacto. Con permiso puedes elegir **A nombre de otra persona**
   y un solicitante del catálogo, aunque no tenga cuenta.
4. Describe el problema y adjunta, si puedes, una **Foto de la solicitud**.
5. Pulsa **Registrar tiquet**. Si aparecen posibles duplicados, revísalos; puedes volver a la
   captura o elegir **Registrar de todas formas**.

Conserva el folio para encontrar la solicitud. Si falla la foto después del registro, el tiquet
ya existe: revisa el aviso antes de intentar registrarlo otra vez.

## Encontrar y consultar un tiquet

En **Tiquets**, busca por folio o descripción y usa los filtros de estado, edificio y categoría.
En el detalle verás **Captura**, **Participantes**, **Línea de tiempo**, **Tiempo por fase** y
**Evidencias**. Pulsa una imagen para ampliarla; cierra el visor con Escape o el botón de cerrar.

**Mi trabajo** muestra lo asignado a tu perfil de técnico. **Bandeja** separa las ofertas para ti,
los tiquets sin asignar y el trabajo en atención. Cada oferta se puede tomar directamente desde la
lista; la campana abre los [avisos](notificaciones.md).

**Bandeja** y **Mi trabajo** ofrecen **Ver tablero**: una vista de solo lectura con columnas por
estado. Pulsa una tarjeta para abrir el tiquet; **Ver lista** vuelve a la bandeja. El tablero no
cambia estados ni reemplaza las acciones del detalle. Si tu equipo tiene más de 100 tiquets
activos, el tablero muestra los más recientes y te avisa para consultar el resto en la lista.

## Coordinar la atención

Desde una oferta, usa **Tomar tiquet**; después, **Asignar técnico**. Hasta que tomes el tiquet, las
demás acciones de coordinación permanecen ocultas: asignar, reasignar, recapturar, rechazar, cancelar,
cambiar prioridad o marcar duplicado. En el detalle puedes abrir **Más** para otras acciones, como
**Reasignar supervisor**, **Agregar auxiliar** o **Cambiar prioridad**. Completa el destinatario,
motivo y demás campos que pida cada formulario. Si actúas a nombre de un técnico o solicitante, el
tiempo y la evidencia se atribuyen a esa persona, no a ti.

El selector **Actuar a nombre de** incluye al solicitante y a los técnicos participantes. Sin
sujeto, la acción es tuya. En validación `both`, elige **Solicitante** para validar su lado y
después **Nadie (acción propia)** para validar el tuyo; el tiquet se cierra al completar ambos.
Si tu cuenta es solicitante y supervisora del mismo tiquet, verás **Validar como solicitante** y,
una vez registrado ese lado, **Validar como supervisor**; cada paso guarda su propio evento y
tiempo. Calificar, reclamar o cancelar a nombre del solicitante también exige elegirlo en el
selector.

Para corregir datos usa **Recapturar** sobre el mismo tiquet. Para un registro repetido usa
**Marcar duplicado** y busca el original por folio. No registres otro tiquet para corregir una
captura.

## Registrar el trabajo

- **Iniciar:** adjunta la evidencia **Antes** y confirma.
- **Registrar avance:** adjunta evidencia del trabajo y, si hace falta, describe el avance.
- **Pausar:** elige un motivo; puedes añadir nota y fecha estimada. Usa **Avanzar subestado**
  para registrar el siguiente paso del flujo. Al **Reanudar**, selecciona la salida que explica
  cómo terminó la pausa. Solo aparecen las opciones habilitadas desde el subestado actual. Si el
  motivo tiene una salida directa, puedes reanudar sin recorrer pasos.
- **Marcar atendido:** adjunta evidencia **Después** y describe el trabajo. Completa los demás
  campos del formulario.

Los campos obligatorios se señalan antes del envío. La evidencia corresponde al ciclo actual;
una reapertura requiere nuevas fotos de antes y después.

Si llevas el seguimiento de otra persona y tienes permiso, selecciona **Actuar a nombre de**.
Para las acciones que lo permiten aparecerá la hora real del trabajo. Las acciones propias usan
la hora de ejecución. Para corregir después una hora, abre **Ajustar hora** en la línea de tiempo;
debe quedar entre las acciones vecinas y el ajuste conserva auditoría.

## Validar o reclamar

Cuando esté atendido, abre el detalle y usa **Validar como solicitante** o **Validar como
supervisor** según la política de la instancia. Si la política exige a ambos, el solicitante valida
primero y el supervisor después; una cuenta con ambos papeles ve los dos botones en pasos
separados. Un supervisor solo puede validar el lado del solicitante eligiéndolo en **Actuar a
nombre de**.
La calificación de satisfacción es opcional: se abre en un modal al validar y, si la cierras sin
enviarla, puedes usar **Calificar** después. Una vez validado, el solicitante no puede
editar el tiquet mientras siga atendido o en reclamación; la reclamación sigue disponible. La
calificación ya enviada no se modifica.

Si hay una inconformidad y todavía no validaste, usa **Abrir reclamación**, indica motivo y
descripción, y adjunta la evidencia. Una vez validado, el solicitante ya no puede abrir una
reclamación, ni siquiera después del cierre; un supervisor sí puede hacerlo a nombre del solicitante
eligiéndolo en el selector.
Quien la evalúa usa **Resolver reclamación** y elige el resultado. Consulta los
[estados y sus condiciones](../reference/estados-y-transiciones.md) para saber qué efecto tiene.

## Consultar métricas

El tablero de **Métricas** resume el periodo con la franja de salud (total de tiquets, tiquets
activos, sin asignar, en pausa, cerrados, cumplimiento del SLA, satisfacción y primera resolución)
y un bento de indicadores: volumen por mes, estado actual por familias, top categorías, desenlaces,
satisfacción y tiempos objetivo. La composición del ciclo y el detalle completo por estado viven en
**Tiempos** y **Distribución**. El selector **Continuo / Laboral / Extra** cambia el reloj de las
fases y tablas: continuo corre 24 horas, laboral solo dentro del calendario del equipo y extra es el
trabajo fuera de ese horario. El SLA usa el reloj de la instancia, salvo que elijas uno en el tablero.

Las pestañas completan el análisis: **Distribución** por dimensión, **Tiempos** con el ciclo, las
fases, la distribución y las personas, **Calidad** con salud de calidad,
diagnóstico por dimensión, atípicos del periodo y motivos de salida (pausas, duplicados y rechazos
o cancelaciones), y
**Equipo** con equipos, supervisores, técnicos y apoyo auxiliar. La participación de técnicos y
el apoyo auxiliar siguen el reloj activo; los supervisores muestran tasa de toma, tasa de
pendientes y retiradas, y el tiempo hasta la toma se identifica como continuo. En Calidad, el riesgo de retrabajo
comparte la dimensión con el mapa de calor, permite elegir la señal (reapertura, recaptura o
reasignación) y compara cada agrupación con el promedio global; el tiempo de pausas y duplicados
se identifica como continuo.
En **Tiempos**, el selector **Medida** de la cabecera (Promedio, Acumulado, Mediana, P90, P95,
Máximo) afecta a las vistas de una sola medida: tabla por dimensión, mapa de calor, ciclo y
exportación. El reloj **Continuo / Laboral / Extra** de la barra superior se aplica a toda la
pestaña. Las medidas robustas se calculan sobre los tiquets que tuvieron la fase: no incluyen
ceros, no son aditivas y se ocultan cuando la muestra es menor a cinco casos. La tarjeta
**Ciclo y fases** reúne la composición del ciclo con la tabla de fases; con una medida robusta se
convierte en **Perfil de fases**, una gráfica de rango por fase (P25–P75, mediana y P90) que no suma
cuantiles. Su escala es compartida y se redondea por encima del P90 más alto, con marcas de tiempo
y una nota que identifica ese P90; con P95 o Máximo el valor de la derecha puede superar el eje. La
tarjeta **Distribución y atípicos** muestra `n / N` (tiquets con la fase sobre el
universo), la mediana, el IQR, el P90, el máximo y el porcentaje fuera de la valla de
1.5×IQR; resalta la columna de la medida activa y no cambia con el selector porque muestra el perfil
completo. Las fichas informativas explican las definiciones al pasar el cursor o al enfocar cada
control, tarjeta o columna. En el detalle del tiquet, **Tiempo por fase** es una lista compacta
ordenada por duración; la reasignación se mide aparte y lo que no cae en una fase se muestra como
sin clasificar.
Los filtros de periodo, edificio, equipo, categoría, dependencia y desenlace nunca amplían lo que tu
alcance permite ver. Los tiquets con hora sin verificar quedan fuera de las medias de desempeño
hasta corregirlos.

Los números de las tarjetas y tablas que representan tiquets abren un panel lateral con la lista
correspondiente. La lista hereda los filtros del tablero, pagina y permite abrir el detalle o pasar a
la lista completa. Para pausas y percentiles la lista muestra los tiquets actuales que cumplen el
criterio, no una reconstrucción exacta de cada evento: un motivo de pausa cuenta pausas y la lista
muestra tiquets con esa pausa, y el perfil de fases lista el universo de la fase, no un tramo exacto
entre cuantiles; con el reloj **Extra** el perfil no ofrece desglose. El desglose requiere permiso
para ver tiquets; sin él, la cifra queda como texto.

## Trabajar sin conexión

Las acciones y fotos admitidas se guardan en este dispositivo y se envían al recuperar conexión.
Puedes **reabrir la app sin red** si validaste la sesión en los últimos 7 días; se muestran los
tiquets y catálogos que ya cargaste. El modo sin conexión no inventa información que nunca se
descargó. El registro de un tiquet nuevo requiere conexión.

Revisa el indicador de pendientes y errores. La aplicación reintenta los fallos temporales cada
30 segundos mientras la pestaña está visible y hay conexión; también puedes pulsar **Sincronizar
ahora**. Si un envío queda en error, abre el aviso, revisa su mensaje y elige **Reintentar** o
**Descartar**. Descartar retira ese envío de la cola local; no deshace una acción ya aceptada en el
servidor. Un error detiene los siguientes envíos del mismo tiquet hasta resolverlo; los otros pueden
seguir. No borres los datos del navegador mientras tengas pendientes: las fotos y acciones aún no
enviadas están guardadas allí.

La copia local de sesión y datos caduca a los 7 días. Al cerrar sesión se borra; no compartas el
dispositivo con otra persona si tienes trabajo pendiente.

## Si una acción no se acepta

Actualiza el detalle y revisa el mensaje: el tiquet pudo cambiar, faltar evidencia o estar fuera de
tu ámbito. Los botones se calculan con permisos y estado; el servidor verifica también alcance,
participación y plazos. Por eso puede rechazar una acción que todavía aparece en pantalla, como
una reclamación fuera de plazo.

La referencia de [Permisos](../reference/permisos.md) explica el acceso. Las reglas institucionales
siguen en [Negocio](../concepts/negocio.md); los límites actuales se indican en las referencias
cuando una capacidad aprobada aún no está disponible.
