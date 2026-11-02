# Usar Axia

Entra con tu cuenta. Si recibiste una contraseña temporal, cámbiala cuando se solicite.
El menú muestra las secciones disponibles para tus permisos y perfil.

## Registrar una solicitud

1. Abre **Tiquets → Nuevo tiquet**.
2. Selecciona edificio, ubicación y dependencia. Las dependencias disponibles dependen de la
   ubicación. Elige categoría, subcategoría y problema; el problema determina el equipo que atiende.
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

**Mi trabajo** muestra lo asignado a tu perfil de técnico. **Bandeja** reúne ofertas y tiquets
para su seguimiento. La campana abre los [avisos](notificaciones.md).

## Coordinar la atención

Desde una oferta, usa **Tomar tiquet**; después, **Asignar técnico**. En el detalle puedes abrir
**Más** para otras acciones, como **Reasignar supervisor**, **Agregar auxiliar** o **Cambiar
prioridad**. Completa el destinatario, motivo y demás campos que pida cada formulario.

Para corregir datos usa **Recapturar** sobre el mismo tiquet. Para un registro repetido usa
**Marcar duplicado** y busca el original por folio. No registres otro tiquet para corregir una
captura.

## Registrar el trabajo

- **Iniciar:** adjunta la evidencia **Antes** y confirma.
- **Registrar avance:** adjunta evidencia del trabajo y, si hace falta, describe el avance.
- **Pausar:** elige un motivo; puedes añadir nota y fecha estimada. Usa **Avanzar subestado**
  para registrar cómo progresa ese motivo. Al **Reanudar**, selecciona el subestado que explica
  cómo terminó la pausa.
- **Marcar atendido:** adjunta evidencia **Después** y describe el trabajo. Completa los demás
  campos del formulario.

Los campos obligatorios se señalan antes del envío. La evidencia corresponde al ciclo actual;
una reapertura requiere nuevas fotos de antes y después.

Si llevas el seguimiento de otra persona y tienes permiso, selecciona **Actuar a nombre de**.
Para las acciones que lo permiten aparecerá la hora real del trabajo. Las acciones propias usan
la hora de ejecución. Para corregir después una hora, abre **Ajustar hora** en la línea de tiempo;
debe quedar entre las acciones vecinas y el ajuste conserva auditoría.

## Validar o reclamar

Cuando esté atendido, abre el detalle y usa **Validar** si te corresponde según la política de
la instancia. La calificación de satisfacción es opcional: se abre en un modal al validar y, si la
cierras sin enviarla, puedes usar **Calificar** después. Una vez validado, el solicitante no puede
editar el tiquet mientras siga atendido o en reclamación; la reclamación sigue disponible. La
calificación ya enviada no se modifica.

Si hay una inconformidad, usa **Abrir reclamación**, indica motivo y descripción, y adjunta la
evidencia. Quien la evalúa usa **Resolver reclamación** y elige el resultado. Consulta los
[estados y sus condiciones](../reference/estados-y-transiciones.md) para saber qué efecto tiene.

## Trabajar sin conexión

Las acciones y fotos admitidas se guardan en este dispositivo y se envían al recuperar conexión.
Abre previamente los tiquets que necesitarás: el modo sin conexión no garantiza que puedas abrir
información que nunca cargaste. El registro de un tiquet nuevo requiere conexión.

Revisa el indicador de pendientes y errores. La aplicación reintenta los fallos temporales; si
un envío queda en error, abre el aviso, revisa su mensaje y elige **Reintentar** o **Descartar**.
Descartar retira ese envío de la cola local; no deshace una acción ya aceptada en el servidor.
Un error detiene los siguientes envíos del mismo tiquet hasta resolverlo; los otros pueden seguir.
No borres los datos del navegador mientras tengas pendientes: las fotos y acciones aún no enviadas
están guardadas allí.

## Si una acción no se acepta

Actualiza el detalle y revisa el mensaje: el tiquet pudo cambiar, faltar evidencia o estar fuera de
tu ámbito. Los botones se calculan con permisos y estado; el servidor verifica también alcance,
participación y plazos. Por eso puede rechazar una acción que todavía aparece en pantalla, como
una reclamación fuera de plazo.

La referencia de [Permisos](../reference/permisos.md) explica el acceso. Las reglas institucionales
siguen en [Negocio](../concepts/negocio.md); los límites actuales se indican en las referencias
cuando una capacidad aprobada aún no está disponible.
