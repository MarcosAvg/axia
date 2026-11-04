# 0116 — Proyección local de acciones offline

**Fecha:** 2026-11-04
**Estado:** aceptada

## Decisión

La interfaz deriva un **estado proyectado** del tiquet a partir de las acciones que siguen en la
cola offline de Dexie. La proyección se calcula en el cliente, en orden de `seq`, y solo para
transiciones deterministas: tomar, reasignar supervisor, iniciar, pausar, avanzar subestado,
reanudar, atender, validar, descartar, abrir y resolver determinadas reclamaciones, y marcar
duplicado. Las acciones de anotación no cambian el estado.

El detalle usa ese estado para el encabezado y para calcular las acciones disponibles, de modo que
«Iniciar» desaparece en cuanto el comando queda en cola. Las listas y el resumen también proyectan
el estado. El estado proyectado se marca como **«Sin sincronizar»** y el detalle enumera los
cambios pendientes con su hora.

La proyección es **solo de presentación**. No escribe estado en el servidor, no altera el caché
persistido de React Query y no sustituye la validación de la sincronización. Cuando una acción
sale de la cola, la invalidez normal refresca la verdad del servidor. Si la cola falla o encuentra
un comando que no puede interpretar, la proyección se detiene en ese punto; el error definitivo se
muestra en el indicador de la cola y no se descarta en silencio.

Las operaciones cuyo resultado depende del ruteo del servidor (`assign_technician` líder/auxiliar,
`recapture`, `reactivate` y `resolve_claim` con tiquet nuevo) se muestran como pendientes pero no
adelantan el estado. La línea de tiempo y el panel de pausa siguen siendo datos del servidor.

## Alternativas y consecuencias

Se descartó actualizar directamente el caché de React Query con el estado optimista: una acción
que el servidor rechaza después deja el caché envenenado y obliga a guardar y restaurar copias.
La proyección desde la cola desaparece sola cuando el comando se sincroniza y respeta el bloqueo
de dependencias de Dexie.

Se descartó limitarse a mostrar «acción pendiente» sin cambiar el estado: el técnico necesita
seguir operando sin señal y ver el resultado inmediato de su trabajo.

Se descartó pedir al servidor la tabla de transiciones al cargar el detalle: no hay red en el
momento en que se necesita y varias transiciones dependen de argumentos o de reglas posteriores.

El coste es mantener una tabla de transiciones en el cliente alineada con el servidor. Las tablas
se prueban por comportamiento y el servidor conserva la autoridad: ante cualquier divergencia, el
resultado de la sincronización corrige la vista. No hay migración de base de datos.
