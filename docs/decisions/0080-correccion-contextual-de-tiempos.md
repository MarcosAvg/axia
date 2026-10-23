# 0080 — Corrección contextual de tiempos manuales

## Contexto

El formulario manual era libre: no mostraba el tramo abierto del tiquet, proponía siempre trabajo
activo y podía agregar un tramo encima de otro, duplicando los indicadores por tipo. La
especificación exige validar que el tramo esté dentro de la vida del tiquet, que no sea futuro y que
las correcciones queden en el historial.

## Decisión

- `GET /api/tickets/:id/manual-time` devuelve los tramos manuales y un contexto con el tramo abierto,
  el estado del tiquet y el técnico sugerido.
- La interfaz distingue **corregir el tramo actual** de **agregar un tramo faltante**.
- Una corrección inserta un tramo manual con `replaces_span_id`, marca el original con `voided_at` y
  `voided_by`, y escribe el evento `manual_time_recorded`. El original no se borra.
- El fin es opcional al corregir un tramo abierto; es obligatorio al agregar uno faltante.
- El servidor valida futuro, orden, vida del tiquet/ciclo y traslape con otro tramo no anulado del
  mismo tipo y sujeto.
- Los indicadores ya excluyen tramos con `voided_at`; no se agregan cálculos alternativos.

## Consecuencias

- Una corrección no duplica el tiempo por tipo.
- El tramo automático sigue siendo la fuente del historial; la corrección es explícita y auditable.
- Los tramos con sujetos distintos pueden traslaparse, lo que permite registrar apoyos auxiliares.
- Se conserva el formulario manual porque las fotos de WhatsApp y otros servicios pierden metadatos.
