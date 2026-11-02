# 0109 — Asignación por líder/auxiliar, titularidad y continuidad de la reclamación

**Fecha:** 2026-11-02
**Estado:** aceptada

## Decisión

`assign_technician` resuelve el papel del técnico según la categoría del tiquet. Si está designado
para esa categoría, ocupa el papel de **líder**; si no, se registra como **auxiliar** y exige un
motivo del catálogo `auxiliary_support`, igual que la acción `add_auxiliary`. La lista de técnicos
del formulario incluye `categoryIds` y muestra “Líder” o “Auxiliar” para que la elección sea
explícita.

Reasignar al líder exige un motivo de `technician_reassignment` y se permite también en
`in_progress` y `paused`: se cierra la pausa o el tramo activo y el tiquet vuelve a `assigned`. Los
auxiliares activos permanecen al cambiar de líder. Si el técnico elegido ya era auxiliar y está
designado para la nueva categoría, se promueve: se cierra su participación auxiliar y se abre la de
líder.

Las acciones de coordinación de un supervisor exigen una asignación abierta como titular en
cualquier estado, no solo en `registered`. Así, un supervisor del mismo equipo que no tomó el
tiquet no puede asignar, agregar auxiliares, recapturar, rechazar, cancelar, cambiar prioridad,
marcar duplicado ni resolver una reclamación. Las acciones propias del solicitante o del técnico
(ámbito `own`) y las del administrador (`all`) conservan su comportamiento. La reasignación de
supervisor valida que el destino tenga un ámbito activo que cubra el equipo y el edificio del
tiquet.

Al abrir una reclamación se cierra el tramo de trabajo o la pausa y se terminan las participaciones
abiertas. La asignación de técnico se conserva para poder reabrir al mismo líder. Si la reclamación
es procedente, el ciclo avanza y se reabre la participación del líder en el ciclo nuevo; si es
improcedente, se termina también la asignación de técnico. En una recaptura que cambia la categoría,
solo se conserva al técnico asignado si sigue designado para la nueva categoría.

## Alternativas y consecuencias

Se descartó rechazar a un técnico no designado en `assign_technician`: la regla de negocio permite
que un supervisor asigne a cualquier técnico y que la participación se clasifique como apoyo
auxiliar. La contrapartida es que el formulario debe explicar el papel y pedir motivo; se evita
crear un tiquet `assigned` sin líder cuando el técnico no es designado, porque en ese caso no se
cambia el estado ni se crea asignación de líder.

Se mantiene una sola participación activa por técnico y tiquet; promover un auxiliar cierra su
participación anterior antes de insertar la de líder. Los auxiliares no se cierran al reasignar al
líder porque su apoyo sigue siendo válido para el ciclo. La reclamación sí cierra todas las
participaciones porque suspende el trabajo y el acceso del técnico durante la revisión.

La validación del ámbito del supervisor destino evita dejar el tiquet asignado a alguien que no
puede verlo ni actuar sobre él. Los tiquets sin candidato siguen yendo a la cola del administrador.
