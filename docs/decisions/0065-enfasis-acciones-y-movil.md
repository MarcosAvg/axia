# 0065 — Énfasis de color en los botones de acción y rejilla móvil

- Fecha: 2026-10-13
- Estado: aceptada

## Contexto

Los botones de acción del tiquet (`ticket-actions-panel`) sólo distinguían tres niveles: la
acción primaria (sólida con el `primary` del tema), el resto en `outline` gris y el descarte en
`destructive` rojo. Con el tema `emerald` eso se percibía como "verde y rojo", sin más matices, y
acciones muy distintas (avanzar, pausar, reclamar) se veían iguales. Además, las filas de botones
eran `flex flex-wrap` pensadas para escritorio: al estrecharse envolvían sin agruparse y algunos
campos con ancho fijo provocaban desbordes horizontales en móvil.

## Decisión

- **Variantes semánticas de tinte suave** en el botón del sistema (`components/ui/button.tsx`):
  `success`, `info` y `warning`, con el mismo patrón que el `destructive` existente (fondo con
  tinte `/10`–`/15` + texto del color, con su contraste en claro y oscuro). El `primary` del tema
  sigue siendo la acción principal sólida.
- **Mapeo puro** en `features/tickets/domain/action-emphasis.ts`: `actionEmphasis(action)`
  devuelve `success | info | warning | danger | neutral` según lo que hace la acción (logro,
  avance, freno, descarte, comunicación). El componente sólo traduce énfasis → variante.
- **Componente compartido `ButtonGrid`** (`components/shared/button-grid.tsx`): **rejilla de dos
  columnas en móvil** y fila que se envuelve en `sm+`. Un hijo con `col-span-2` ocupa todo el
  ancho en móvil (la acción primaria).
- **Aplicación completa**: acciones del tiquet, pies de formularios (`FormActionsBar` y los
  formularios de acción), acciones rápidas del Panel, rangos rápidos y exportación de Métricas,
  filtros de Operación y alerta de duplicados.
- **Campos y contenedores móviles**: los anchos fijos (`w-40`/`w-44`) pasan a `w-full sm:w-*`, y
  el contenedor de acciones del `PageHeader` ocupa el ancho en móvil para que la rejilla se vea.

## Alternativas consideradas

- **Colores sólidos**: más ruido visual y contraste difícil de garantizar en los cinco temas;
  se prefiere el tinte suave, coherente con el ADR 0063.
- **Arreglar botón por botón sin sistema**: se descarta; un mapeo puro y una rejilla reutilizable
  mantienen el criterio y son fáciles de probar.

## Consecuencias

- Las acciones se leen de un vistazo por color además del texto; el descarte conserva su lugar
  separado (divisoria) en móvil y escritorio.
- `ButtonGrid` y `actionEmphasis` tienen pruebas (éste último puro); el resto se cubre con la
  compuerta y las capturas de verificación.
- Los baselines visuales (opt-in, de escritorio) no cambian: en `sm+` la rejilla se comporta como
  la fila anterior.
