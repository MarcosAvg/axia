# 0129 — Captura local durante el trabajo en campo

**Fecha:** 2026-11-21
**Estado:** aceptada

Mi trabajo reutiliza las consultas de detalle y los catálogos de los formularios para preparar
los tiquets. La disponibilidad se comprueba contra el detalle y los catálogos persistidos
para la cuenta de la pestaña. Un fallo transitorio al actualizar conserva la última copia válida. La interfaz muestra la vigencia de la sesión local y la hora del detalle guardado.

Los borradores de inicio y pausa viven en Dexie. La clave incluye cuenta, tiquet, ciclo, acción
y sujeto de actuación. Una captura abierta después de cerrar la app requiere elegir si se retoma
el borrador del mismo contexto o se descarta. Los archivos del borrador se guardan como blobs con
nombre. Ante un error de almacenamiento, el formulario conserva los datos abiertos para que
la persona pueda volver a intentar. Un borrador se elimina al confirmar con éxito o al descartar.

Cuando una foto necesita encolarse, IndexedDB guarda el archivo y su referencia de cola en
una transacción, incluso si la conexión se perdió durante el envío directo. Agregar operaciones nuevas ya no espera a que termine la red. El procesamiento y
las modificaciones de entradas existentes siguen serializados en la pestaña.

El historial muestra un bloque de actividad local con fotos y operaciones pendientes junto a los
eventos confirmados. Al sincronizar, un reenvío de la misma cuenta y del mismo tiquet pasa por el
manejador idempotente antes de volver a clasificar su hora. El manejador mantiene las comprobaciones
del tipo de evento y del alcance de la acción. Los fallos transitorios de HTTP se reintentan y un
rechazo queda disponible para revisión en el tiquet.

Se eligió la misma IndexedDB para conservar el archivo y los valores entre reaperturas y reutilizar
las consultas observables. Una copia adicional en localStorage duplicaría el estado, tendría menos
capacidad para fotos y requeriría codificarlas. Si el navegador borra los datos de la aplicación,
se pierden los borradores y las copias locales que todavía no estaban en el servidor.

El smoke de hora manual espera el estado confirmado después de asignar. La compilación PWA
puede cerrar el diálogo antes de que se actualicen las acciones del tiquet.

Con conexión, **Mi trabajo** prepara los primeros 20 tiquets de la lista (los más recientes).
Reutiliza el detalle vigente, descarga de uno en uno y limita cada detalle precargado a 256 KiB.
La etiqueta «Disponible sin conexión» requiere el detalle y los catálogos persistidos, además
de una sesión vigente. Al confirmar la lista con el servidor, se quitan las copias de la
precarga que salieron de ella o dejaron de estar entre los primeros 20. Una vista de detalle
abierta conserva temporalmente su consulta.

El servidor rechaza con `evidence_ticket_final` las nuevas evidencias de trabajo capturadas
sin conexión en un tiquet final visible. Tras terminar la asignación, solo confirma el rechazo
al técnico cuya participación terminó con el cierre del ciclo de captura. La foto sale de la cola de
subida y queda en el dispositivo por hasta siete días desde el rechazo, con un presupuesto
compartido de 32 MiB para estos rechazos. Se eliminan primero las fotos más antiguas al llegar
al límite. La limpieza corre al abrir la app, volver a primer plano o sincronizar. Las fotos
pendientes por otros motivos conservan su flujo. Si el tiquet vuelve a aparecer en **Mi trabajo**,
Axia presenta al servidor la captura con su UUID y ciclo de origen para que valide si procede.

Cuando el navegador detecta que está sin conexión, confirmar una acción escribe directamente
en la cola local. El formulario espera esa escritura para cerrar y limpiar el borrador.
La sincronización con el servidor se realiza después.

Las interrupciones de transporte en TUS conservan la foto en la cola para reintentar.
La sincronización también recupera los fallos transitorios de TUS que versiones anteriores
guardaron como definitivos. El inicio y la pausa siguen esperando la foto del mismo tiquet.
