# 0030 — Adaptador de importación CSV/Excel

- Fecha: 2026-10-08
- Estado: aceptada

## Contexto

La Fase 6A dejó la infraestructura genérica (`import_batches`, `import_records`, `catalog_aliases`,
`import_status_map`, `data.import`, `import_ticket_upsert`). Falta el **adaptador** que lea la fuente
heredada (CSV/Excel), normalice y alimente esa infraestructura, **aislado del núcleo**.

## Decisión

- **Feature `features/integrations/`** (aislada): dominio puro, adaptador, API, hooks y UI.
- **Lectura**: CSV con **papaparse** (MIT) y Excel (`.xlsx`) con **exceljs** (ya presente, en
  diferido). El adaptador no conoce el núcleo más allá de sus RPCs públicas.
- **Normalización pura y probada**: cabeceras canónicas (con las erratas de la fuente), fecha
  `17/jun/2026 - [14:14:00]` interpretada en la **zona horaria configurada**, marcadores
  «No atendido»/«No contabilizado» → `NULL`.
- **Flujo**: `dry run` (reporte de calidad con alias sin resolver, estatus sin mapear, filas
  inválidas; guardado en `import_records`) → resolución de alias y estatus desde la UI → `commit`
  (`import_ticket_upsert` + asignación del técnico).
- **Asignación del técnico**: nueva RPC genérica `import_ticket_assign` (idempotente), porque la
  asignación no forma parte del upsert del tiquet.
- **Frontera**: se permite que **`routes/`** (capa de composición) importe
  `features/integrations/`; el núcleo (`features/*`, `lib`, `components`) sigue sin poder hacerlo.
  Se ajusta `no-core-to-integrations` en la configuración de dependency-cruiser.
- **Supuestos** (reversibles): «Asignación de trabajo» = asignación al técnico; «intervalo de
  atención» = reporte → asignación; «intervalo de trabajo» = asignación → finalización; la
  «autorización» es la asignación del supervisor.

## Alternativas consideradas

- **Edge Function**: se difiere; el primer adaptador lee en el navegador (sin secretos).
- **Parser CSV propio**: se prefirió papaparse (robusto con comillas y saltos).

## Consecuencias

- El adaptador incorpora la fuente sin tocar el núcleo; los estatus y alias se resuelven por datos.
- La **autorización** (supervisor) y los nombres con variantes muy distintas pueden quedar por
  resolver; se ven en el reporte y se completan por alias.
- **6C** (verificación de métricas contra la fuente) queda pendiente; requiere datos equivalentes.
