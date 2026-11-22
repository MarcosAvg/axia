# 0130 — Recuperación de la cola offline

**Fecha:** 2026-11-22

**Estado:** aceptada

Una pestaña puede cerrarse durante una subida y otra puede intentar recuperar la misma operación.
Además, el navegador puede perder la respuesta después de que el servidor haya confirmado la foto.
El indicador de conexión informa el estado de red del navegador y no confirma una respuesta del
servidor.

Web Locks serializa el procesamiento y la resolución manual de la cola entre pestañas. El navegador
libera el bloqueo al cerrar una pestaña y permite retomar la cola al abrirla de nuevo. En
navegadores sin Web Locks se conserva la espera de un minuto para recuperar un envío interrumpido.
Se descartó implementar un bloqueo propio con temporizadores en IndexedDB porque habría que
coordinar su renovación al suspender o cerrar una pestaña.

La reserva de evidencia devuelve si el servidor ya procesó la foto asociada al UUID. El cliente
puede retirar esa foto de la cola y continuar con las acciones del tiquet. Los fallos de transporte
se reintentan mientras la PWA está visible y hay conexión. Los rechazos de negocio mantienen su
tratamiento y requieren revisión.

La cola registra la confirmación del servidor antes de refrescar las consultas. Si una lectura
falla, el siguiente ciclo retoma la lectura con la misma confirmación. Cada tiquet retira sus
operaciones cuando se actualizan las vistas activas que lo muestran.

El mecanismo mantiene los UUID existentes. El estado confirmado se guarda en el campo de estado
de la cola local y no requiere migración de base de datos.
