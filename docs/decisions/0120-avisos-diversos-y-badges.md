# 0120 — Avisos diversos, texto enriquecido y badges de bandeja

**Fecha:** 2026-11-05
**Estado:** aceptada

## Decisión

Los avisos in-app se generan con reglas por evento y destinatario, y el texto se compone al leer.
`GET /api/notifications` enriquece cada aviso con el autor, el motivo y el contexto del tiquet
(equipo, edificio, categoría, prioridad y datos relacionados del `payload`). La interfaz convierte
esos datos en títulos y detalles con una función pura del dominio web.

Se activan reglas para reasignación de supervisor y de técnico, apoyo auxiliar, recaptura, cambio de
prioridad, atendido pendiente de validación, validación, reclamación resuelta, reapertura,
reactivación y calificación. La regla nueva `subject_technician` avisa al técnico que el evento
señala como sujeto, necesario para el apoyo auxiliar porque no crea una asignación propia.

El actor nunca recibe el aviso de su propia acción. La comprobación vive en `notify_event()`.

Los badges de Bandeja y Mi trabajo usan `GET /api/tickets/attention`, que reutiliza el alcance y los
filtros de las listas. Bandeja cuenta ofertas vigentes y Mi trabajo cuenta tiquets no finales
asignados al técnico. El armazón consulta ese resumen una vez, lo invalida con el SSE existente y
pinta el mismo componente en sidebar y barra móvil.

## Contexto

El catálogo anterior solo cubría diez eventos y el aviso mostraba la etiqueta del evento y el folio.
Dos asignaciones o dos rechazos del mismo tiquet se veían iguales: sin autor, sin motivo y sin el
cambio concreto. La bitácora ya guardaba `actor_id`, `reason_id` y un `payload` por evento, y la
vista `v_ticket_timeline` ya resolvía nombres de autor, sujeto y motivo.

Los conteos de las pestañas no existían; el panel cargaba listas completas para calcularlos, lo que
no sirve en el resto de la aplicación.

## Alternativas y consecuencias

Se descartó enriquecer al escribir dentro de `notify_event()`: el texto en español viviría en
PL/pgSQL, los avisos históricos necesitarían relleno y las pruebas de copy serían más costosas. La
lectura enriquecida reutiliza la bitácora inmutable y mejora también los avisos ya creados.

Se descartó reutilizar `/api/tickets/offers` y `/api/tickets/mine` con `pageSize=1`: descarga joins
completos por un número y el total de Mi trabajo no coincide con la lista porque el cliente filtra
estados finales. El endpoint de conteo comparte los predicados de `countTickets` con las listas.

El enriquecimiento añade joins a la consulta de la bandeja; el límite de 50 avisos mantiene el coste
acotado. La copia vive en el cliente para conservar los textos de interfaz en español y poder
probarla como función pura. Quedan fuera de esta decisión Web Push, correo, preferencias por
usuario, seguidores de tiquet, avisos de escalamiento y de tiquets sin tomar, que requieren un
proceso programado o una superficie de configuración propia.
