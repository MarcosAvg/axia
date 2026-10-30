# 0098 — El equipo se asigna al problema

**Estado:** aceptada
**Fecha:** 2026-10-30

## Contexto

El equipo que atiende un tiquet se heredaba de la categoría (`categories.team_id`). En la estructura
real el equipo depende del **problema**: una categoría puede contener problemas de distintos
equipos. Como la estructura todavía se está definiendo, no hace falta conservar tiquets,
clasificación ni designaciones anteriores.

## Decisión

- `problems.team_id` es obligatorio; `categories.team_id` desaparece.
- El alta exige **problema** y **subcategoría**; el equipo del tiquet se deriva del problema. El
  ruteo usa ese equipo.
- La recaptura recalcula el equipo cuando cambia el problema; no se permite dejar la clasificación
  sin problema.
- La designación de técnicos sigue siendo por **categoría**; el equipo del problema solo decide el
  ruteo.
- Migración `0015` de corte limpio:
  - `TRUNCATE tickets CASCADE`.
  - `TRUNCATE categories CASCADE`.
  - Quitar `categories.team_id` y su unicidad `(team_id, name)`.
  - Añadir `problems.team_id` y `UNIQUE(categories.name)`.
- XLSX:
  - Categorías: `Categoría · Activo`.
  - Subcategorías: `Categoría · Subcategoría · Activo`.
  - Problemas: `Categoría · Subcategoría · Problema · Equipo · Prioridad por defecto · Activo`.
- Se retira la compatibilidad con los formatos anteriores: no hay datos que conservar.

## Alternativas consideradas

- **Conservar el equipo en la categoría**: obliga a duplicar categorías por equipo y contradice la
  estructura real.
- **Migrar y fusionar categorías/problemas**: innecesario porque no se conserva historia.
- **Un trigger diferido para exigir el problema/equipo**: la API y la interfaz ya validan; el corte
  limpio evita arrastrar estados antiguos.

## Consecuencias

- Los tiquets, categorías, subcategorías, problemas y designaciones técnico–categoría existentes se
  borran en la migración.
- Usuarios, equipos, edificios, ubicaciones, dependencias, solicitantes, prioridades, canales y
  motivos permanecen.
- La semilla demo y los fixtures crean la clasificación nueva con equipos por problema.
- Los archivos XLSX de versiones anteriores deben reexportarse.
