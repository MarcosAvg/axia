# 0114 — Fases exclusivas y desenlaces propios

**Fecha:** 2026-11-04
**Estado:** aceptada

## Decisión

Cada tiquet tiene **una sola fase primaria abierta** en `time_spans` desde `reported_at` hasta
`closed_at` o `now()`. Los eventos cierran la fase anterior y abren la siguiente en el mismo
instante. `pending_take` cubre las esperas posteriores a una reasignación; `supervisor_response`
sigue midiendo la primera toma. `reassignment` y `duplicate_review` son anotaciones: se conservan
para sus indicadores, pero no suman en la barra de fases. `recapture` no abre un tramo propio.

La base de métricas conserva **todos** los tiquets. `outcome` (`open`, `closed`, `rejected`,
`cancelled`, `duplicate`) es una dimensión y un filtro, no una exclusión. Cada indicador declara su
universo:

- Volumen, estado, motivos y desenlaces: todos.
- Respuesta, asignación, espera, trabajo activo, pausa y reclamación: todos, segmentables por
  desenlace.
- Reasignación y recaptura: todos.
- Tiempo de resolución, SLA, primera resolución y reapertura: solo `closed`.
- Carga por técnico: rechazados y cancelados sí; duplicados no, porque la especificación los deja
  fuera de desempeño y carga.
- Duplicados: volumen, tasa y tiempo de revisión propios.

Rechazar, cancelar o marcar duplicado no convierte el tiquet en cerrado. El `closed` de los KPIs
sigue siendo solo `status = 'closed'`.

## Alternativas y consecuencias

Se descartó normalizar la barra sobre el tiempo clasificado o repartir el residuo: oculta tiempo
real y no corrige la causa. También se descartó excluir de la base a rechazados, cancelados y
duplicados: el volumen y los motivos son indicadores necesarios, y el esfuerzo invertido en un
tiquet descartado existió.

El coste es una migración que reconstruye todos los tramos históricos, un índice único parcial para
impedir dos fases primarias abiertas y consultas con denominadores explícitos. Si un tramo histórico
no puede reconstruirse por falta de eventos, la fase abierta cubre el hueco hasta el siguiente
evento; la vista `v_ticket_phase_coverage` debe quedar en cero para todos los tiquets.

El tiempo entre un cierre terminal y una reapertura o una reclamación abierta después del cierre se
atribuye a la fase que se abre, para que la cobertura no tenga huecos; el `closed_at` y el evento
terminal usan la misma hora de acción.

La cobertura se verifica con pruebas de integración por recorrido: registrado, asignado directo,
en proceso, pausado, atendido, reclamación desde cerrado, reapertura, reasignación, validación
`both`, rechazo, cancelación, duplicado, reactivación y `closed_at` posterior al último evento.
