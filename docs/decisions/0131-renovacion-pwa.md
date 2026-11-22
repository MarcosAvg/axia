# 0131 — Activación y renovación de la PWA

**Fecha:** 2026-11-22

**Estado:** aceptada

El aviso sigue la actualización del service worker del origen de Axia. El botón aparece cuando
hay un worker en espera o cuando otra pestaña ya activó la actualización. Solo recarga la pestaña
que confirma. Workbox instala la nueva precaché antes de ofrecer la activación y, al activar,
retira las entradas anteriores que ya no se utilizan.

Las copias de consultas conservan la identidad del paquete web que las guardó, derivada de los
recursos de entrada con huella de contenido. Una página con otro paquete restaura esas copias
marcadas para revalidación. Los datos compatibles siguen disponibles mientras falte la red y
**Mi trabajo** vuelve a preparar el contenido que aún necesita revalidarse. La cola, las fotos y
los borradores se conservan en sus tablas habituales.

Se descartó borrar IndexedDB o forzar una recarga en todas las pestañas, porque podría interrumpir
la captura o perder trabajo. Se puede revertir el aviso y la identificación de las copias sin
migrar la base. La identidad del paquete en la copia persistida es opcional.
