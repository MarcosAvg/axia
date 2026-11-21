# 0129 — Captura local durante el trabajo en campo

**Fecha:** 2026-11-21
**Estado:** aceptada

Mi trabajo reutiliza las consultas de detalle y los catálogos de los formularios para preparar
los tiquets seleccionados. La disponibilidad se comprueba contra el detalle y los catálogos persistidos para la cuenta
de la pestaña. Un fallo transitorio al actualizar conserva la última copia válida. La interfaz muestra la vigencia de la sesión local y la hora del detalle guardado.

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
