# 0013 — Detección de posibles duplicados con pg_trgm

- Fecha: 2026-10-07
- Estado: aceptada

## Contexto

Al registrar hay que avisar de posibles duplicados (sin bloquear) comparando descripciones
similares, dentro de una ventana de tiempo y con la misma ubicación/problema.

## Decisión

Usar la extensión **`pg_trgm`** (disponible en PostgreSQL): índice GIN sobre `tickets.description` y
la función `similarity` con umbral y ventana configurables (`instance_settings`). Los candidatos se
guardan en `ticket_duplicate_candidates` y el tiquet se marca `possible_duplicate`. **No bloquea.**

## Alternativas consideradas

- **Full-text search:** orientado a palabras completas, no a similitud.
- **Comparar en la aplicación:** menos eficiente y con más datos transferidos.

## Consecuencias

- Requiere habilitar `pg_trgm` (lo hace la migración del tramo 1).
- Los duplicados quedan fuera de los indicadores de desempeño; al marcarlos se enlazan y se avisa
  al solicitante (sin "seguidores").
