# 0029 — Infraestructura genérica de importación (Fase 6A)

> **Archivada.** Esta decisión describe una implementación anterior. Se conserva como historia y no debe usarse como guía del sistema actual.


- Fecha: 2026-10-08
- Estado: aceptada

## Contexto

La Fase 6 (integraciones y migración) es opcional y debe quedar **aislada del núcleo**: Axia no
puede nombrar ni depender de plataformas externas. Se necesita, dentro del núcleo, una
infraestructura **genérica** que cualquier adaptador use, sin acoplarse a una fuente concreta.

## Decisión

- **Tablas genéricas**: `import_batches` (lote: sistema, modo, estado, resumen),
  `import_records` (fila cruda `raw jsonb` + resultado), `catalog_aliases` (texto original →
  registro del catálogo) e `import_status_map` (estatus de origen → estado de Axia). Ya existían
  `external_systems` y `ticket_external_refs`.
- **El sistema es dato**: no hay constantes de plataformas en el esquema ni en la interfaz; el
  origen se registra en `external_systems`.
- **Permiso `data.import`** (semilla: solo administrador) para leer lotes y escribir por RPC.
- **RPC del núcleo** `import_ticket_upsert(system, external_id, data)`: upsert **idempotente** por
  `(system, external_id)`, **conserva el número original** como `ticket_number`, **avanza la
  secuencia** por encima del mayor importado, garantiza la referencia externa y escribe el evento
  `imported` con `source = 'import'`.
- **RPCs de apoyo**: abrir/cerrar lote, guardar fila, resolver/definir alias y estatus.
- **Adaptadores aislados** (lectura y normalización de la fuente) quedan para 6B, en
  `features/integrations/**` o `adaptadores externos/**`, fuera del núcleo.
- **UI de administración** `/admin/integraciones`: mapeo de estatus y lista de lotes (el CRUD de
  alias y el reporte de calidad se completan con el adaptador en 6B).

## Alternativas consideradas

- **Nombrar plataformas en el núcleo**: prohibido por el principio de independencia (ADR 0006).
- **Solo Edge Function**: se difiere; el primer adaptador puede leer en el navegador.

## Consecuencias

- Cualquier fuente se integra por datos (sistema, alias, estatus), sin tocar el núcleo.
- La importación es de administrador y **idempotente**: reimportar no duplica ni destruye.
- Pendiente en 6B: adaptador CSV/Excel, CRUD de alias y reporte de calidad del *dry run*.