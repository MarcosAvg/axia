# 0007 — Solicitante mixto (catálogo con vínculo opcional a una cuenta)

- Fecha: 2026-10-07
- Estado: aceptada

## Contexto

La especificación asumía que todo solicitante tiene cuenta, pero la institución registra tiquets
a nombre de personas que no usan la aplicación. Se necesita soportar ambos casos sin migrar datos
después y con indicadores "por solicitante" estables.

## Decisión

Un **catálogo de solicitantes** (`requesters`) con `user_id` opcional (único cuando existe). El
tiquet referencia el solicitante y guarda una **instantánea** del nombre y contacto. Se distingue
**quien registra** (`registered_by`) de **quien solicita**. Quien tiene permiso puede crear a
nombre de otro (`ticket.create_on_behalf`).

## Alternativas consideradas

- **Solo campos de texto en el tiquet:** simple, pero agrupar por solicitante es frágil y no
  permite reutilizar contactos.
- **Exigir cuenta:** descartado por la operación real.

## Consecuencias

- Indicadores por solicitante estables y contactos reutilizables.
- Las acciones del solicitante sin cuenta (validar, cancelar, reclamar, calificar) se ejercen por
  quien tenga el permiso correspondiente, en su nombre (ver 0008).
- Revertir implica sustituir el catálogo por columnas en el tiquet.
