# 0096 — Clasificación en columnas dentro del XLSX

**Estado:** aceptada
**Fecha:** 2026-10-30

## Contexto

El XLSX de catálogos exportaba Categorías, Subcategorías y Problemas en hojas separadas, pero las
referencias al padre se escribían en una sola celda con la ruta `Equipo / Categoría`. Para editar
el archivo había que descifrar y mantener esa ruta; además, un nombre con `/` era ambiguo.

## Decisión

- **Una columna por nivel**, manteniendo las tres hojas:
  - Categorías: `Equipo | Categoría | Activo`
  - Subcategorías: `Equipo | Categoría | Subcategoría | Activo`
  - Problemas: `Equipo | Categoría | Subcategoría | Problema | Prioridad por defecto | Activo`
- Las columnas `Equipo` y, en Problemas, `Categoría` son de **contexto**: se leen para desambiguar
  el padre, pero no se guardan en la tabla. El importador resuelve en orden equipo → categoría del
  equipo → subcategoría de la categoría.
- La exportación usa el nombre simple de cada nivel (no la ruta); las columnas de contexto aportan
  la desambiguación.
- Se conserva la lectura del formato anterior: si falta el contexto, se acepta la ruta
  `Equipo / Categoría` y el encabezado antiguo `Nombre`. Un archivo exportado con la versión
  anterior se sigue pudiendo importar.
- Una referencia sin contexto y con dos coincidencias se reporta como ambigua; no se elige al azar.

## Alternativas consideradas

- **Una sola hoja compendio** con Equipo, Categoría, Subcategoría y Problema en cada fila: más
  legible, pero una fila tendría que crear o actualizar hasta cuatro niveles y las categorías sin
  problemas dejarían celdas vacías. Se descartó por complejidad y por mezclar cuatro catálogos en
  una sola operación.
- **Mantener la ruta en una celda**: es lo que se quiere evitar.

## Consecuencias

- Editar el archivo es directo: cada nivel se cambia en su columna.
- El formato exportado cambia; la compatibilidad de lectura evita perder los archivos anteriores.
- `catalog-import-specs.ts` sigue siendo la única fuente de columnas para exportar e importar.
