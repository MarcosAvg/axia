# 0094 — Exportar e importar catálogos en un solo XLSX

**Estado:** aceptada
**Fecha:** 2026-10-30

## Contexto

Los catálogos maestros se administran uno por uno en `/admin/catalogos`. Hacía falta un respaldo
legible y una forma de cargar una instancia nueva sin capturar todo de nuevo. La versión anterior
tenía una plantilla XLSX de importación, pero se retiró con el corte de stack y nunca hubo
exportación. El requisito es que **el archivo exportado sea el mismo que se importa**.

## Decisión

- **Un solo libro `catalogos.xlsx`** con una hoja por catálogo, en orden de dependencias, usando los
  encabezados en español de `CATALOG_IMPORT_SPECS` (las mismas reglas de la importación anterior).
  La clasificación se detalla en el ADR 0096, con una columna por nivel.
- **Referencias por nombre**, no por UUID: el id no sirve fuera de la instancia. En catálogos donde
  el nombre se repite bajo padres distintos (categorías, subcategorías, problemas, ubicaciones) la
  celda lleva la ruta completa (`Equipo / Categoría`) y el importador acepta el nombre simple si es
  único. Una referencia con dos coincidencias se reporta y no se resuelve al azar.
- **Booleanos `Sí`/`No`** y opciones fijas por su etiqueta; se exportan también las filas inactivas.
- **Importación hoja por hoja y en orden de dependencias.** Las referencias se resuelven contra la
  base y contra lo insertado en la misma carga; las filas con referencias pendientes se reintentan
  al final. Así el archivo restaura una instancia vacía.
- **Clave natural idempotente**: reimportar inserta lo nuevo y actualiza lo existente, sin duplicar.
  No se borra nada y una celda vacía deja el campo como está.
- **Sin endpoint nuevo**: se reutilizan `GET/POST/PATCH /api/admin/catalogs/:table` con el permiso
  `catalog.manage`. La lectura, el dry-run y la escritura viven en el cliente.
- **Reporte por hoja** (nuevas, actualizadas, inválidas, errores) e incidencias por fila.

## Alternativas consideradas

- **RPC transaccional por hoja** (como la versión anterior): más robusta ante fallos, pero duplica
  las especificaciones en el servidor y añade una migración; esta versión no la necesita.
- **Un archivo por catálogo**: simple de leer, pero no respalda la instancia completa de una vez.
- **CSV**: no permite varias hojas ni conserva tipos con comodidad.
- **Exportar ids**: obliga a que el archivo solo sirva en la misma instancia.

## Consecuencias

- El archivo sirve de respaldo y de plantilla: las hojas vacías solo llevan encabezados.
- Un error de base a mitad de la importación deja aplicadas las filas anteriores; las filas ya se
  validaron antes de escribir y el reporte identifica la fila fallida.
- No hay borrados ni historial de cargas.
- No se exportan `teams.work_calendar_id` ni los vínculos `user_id` de solicitantes y técnicos.
- Cambiar la lista de columnas importables exige tocar `catalog-import-specs.ts`; exportación e
  importación comparten esa única fuente.
