# 0009 — Tiempos: tramos, clasificación de reloj y tiempos manuales

- Fecha: 2026-10-07
- Estado: aceptada

## Contexto

Medir tiempos es el objetivo central de Axia. Los tiempos corren 24 horas y además deben poder
medirse en horario laboral (turnos). Algunos técnicos no tienen cuenta y comunican sus tiempos a
quien lleva el seguimiento.

## Decisión

El historial de tiempos son **tramos con inicio y fin** (`time_spans`), derivados de la bitácora
por un disparador; cada tramo **copia la clasificación de reloj** (`counted`/`not_counted`) del
motivo al crearse. Se pueden **registrar tramos a mano** (`origin = 'manual'`) con validaciones
(orden y pertenencia a la vida del tiquet), permiso `time.record_manual`. Total = continuo
(`reported_at` → cierre); neto = total menos tramos no contables. La versión laboral cruza los
tramos con el calendario.

## Alternativas consideradas

- **Almacenar cifras sueltas:** prohibido por la especificación; el tiempo se calcula.
- **Derivar todo en consulta sin `time_spans`:** más costoso y sin lugar para los tiempos manuales.

## Consecuencias

- Los indicadores se calculan desde el historial; nada se duplica como cifra.
- La corrección de un tiempo es un tramo nuevo (historial), no una edición.
- El modo laboral se completa en la Fase 6.
