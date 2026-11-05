# 0118 — Ámbito de detección de duplicados

**Fecha:** 2026-11-05
**Estado:** aceptada
**Refina:** [0105](0105-deteccion-revision-duplicados.md)

## Decisión

La detección de posibles duplicados compara solo tiquets no finales del **mismo edificio, ubicación y
dependencia** dentro de la ventana configurable. Se mantiene la admisión por **mismo problema** o por
superar el umbral de similitud del texto normalizado, pero siempre dentro de ese ámbito.

La vista previa exige `locationId` y `dependencyId`; sin ellos responde `400`. Los candidatos con
ubicación o dependencia nulas no se consideran, porque no se puede confirmar el ámbito.

Como ubicación y dependencia pasan a ser constantes, dejan de pesar en el puntaje y dejan de figurar
como motivos. El puntaje se reparte entre lo que distingue a los candidatos: `0.50` similitud de
texto, `0.40` mismo problema y `0.10` misma subcategoría. Los motivos guardados y mostrados son
`problem` y `subcategory`.

## Alternativas y consecuencias

Antes el ámbito era todo el edificio, con ubicación, problema, subcategoría y dependencia como
señales ponderadas. En edificios concurridos eso producía avisos demasiado generalistas. Acotar a
edificio, ubicación y dependencia reduce el ruido, pero puede dejar de avisar un mismo problema real
reportado por otra dependencia en la misma ubicación; se acepta porque cada dependencia responde por
su propio registro y la persona aún puede enlazar por folio desde el formulario de marcado.

La dependencia era una señal blanda del puntaje; hacerla obligatoria cumple el requisito de que el
aviso no cruce unidades. Mantenerla blanda se descartó porque seguía mostrando casos de otra
dependencia. No se reescriben candidatos históricos: `pnpm db:duplicates` recalcula las alertas
pendientes de los tiquets abiertos y las decisiones ya tomadas se conservan.
