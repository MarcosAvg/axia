# 0059 — Importación de catálogos por plantilla XLSX

- Fecha: 2026-10-10
- Estado: aceptada

## Contexto

Los catálogos maestros (equipos, edificios, ubicaciones, categorías, subcategorías, problemas,
tipos de servicio, prioridades, canales, solicitantes, técnicos y motivos) se capturaban **uno por
uno** en Administración. Cargar una instancia nueva o migrar catálogos era lento y propenso a
errores. El importador existente solo crea **tiquets** y resuelve nombres a registros ya existentes;
**no crea catálogos**.

Como es dato **propio del núcleo** (no de un sistema externo), esta función debe vivir en
Administración y usar el permiso `catalog.manage`, no el adaptador de integraciones.

## Decisión

- **Plantilla XLSX generada en la app**: una hoja por catálogo, en **orden de dependencias**, con
  encabezados fijos, una hoja "Listas" con los valores válidos y **validación de datos** en las
  columnas de referencia y de opciones. **Sin filas de ejemplo** (para no importar datos falsos por
  descuido); en su lugar, una hoja de instrucciones.
- **Referencias por nombre**: el cliente carga los catálogos y resuelve cada nombre a su `id`; los
  no resueltos se reportan y bloquean esa fila (no se inventan). El padre de un motivo se
  desambigua por su **uso**.
- **Emparejamiento por clave natural** (idempotente, reimportar actualiza y no duplica):
  `name` para equipos, edificios, dependencias, tipos de servicio, prioridades y canales; par
  (padre, nombre) para ubicaciones, categorías, subcategorías y problemas; (uso, padre, nombre)
  para motivos; **solicitantes y técnicos** por (nombre, dependencia/equipo), ya que no tienen
  clave natural única.
- **Dry run en cliente**: reporte por catálogo de nuevas, a actualizar, inválidas y duplicadas en el
  archivo. **No se escribe nada** hasta confirmar.
- **Escritura por RPC genérica atómica** (`secundario`): `catalog_import_sheet(run, catalog, rows)`
  upserta una hoja completa en **una transacción**, con una **lista blanca** de tablas y columnas
  (`catalog_import_specs`); los identificadores salen de la lista y los valores van parametrizados.
  Los errores por fila se capturan y se registran sin abortar el resto.
- **Historial**: `catalog_import_runs` y `catalog_import_rows` (autor, archivo, estado, resumen y
  resultado por fila). Lectura con `catalog.manage`; escritura solo por las RPCs `security definer`.
- **Sin borrados**: solo crear/actualizar y activar/desactivar.

## Alternativas consideradas

- **CRUD fila por fila desde el cliente**: sin migración, pero muchas llamadas y sin atomicidad.
- **Una RPC por catálogo**: explícita pero mucho más código y migraciones.
- **Filas de ejemplo en la plantilla**: riesgo de importarlas como datos reales.
- **Crear catálogos desde el importador de tiquets**: mezcla el núcleo con un adaptador externo.

## Consecuencias

- Cargar una instancia o migrar catálogos deja de ser manual; el mismo archivo se puede reimportar
  sin duplicar.
- Nuevas tablas `catalog_import_specs`, `catalog_import_runs`, `catalog_import_rows` y RPCs
  `catalog_import_start` / `catalog_import_sheet` / `catalog_import_finish`.
- Nuevas piezas en Administración: `domain/catalog-import.ts` (funciones puras con pruebas),
  `components/catalog-import-*` y el botón "Importar archivo" en `/admin/catalogos`.
- Sin cambios en el adaptador de integraciones ni en el modelo de tiquets.
