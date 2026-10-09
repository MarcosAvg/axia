# 0040 — Componentes de datos y vista de escritorio

- Fecha: 2026-10-09
- Estado: aceptada

## Contexto

Las listas se presentaban como tarjetas apiladas (`<ul>`), cómodas en móvil pero lentas de
escanear en escritorio. Faltaban encabezados de página, estados vacíos homogéneos y una tabla de
datos. El plan de rediseño preveía añadir TanStack Table.

## Decisión

- **Tabla propia y presentacional** (`components/shared/data-table.tsx`) sobre las primitivas
  `table` de shadcn/ui: define columnas, oculta columnas por punto de quiebre y permite filas
  navegables por clic y por teclado. **No se añade TanStack Table todavía**: el orden y la
  paginación son del servidor, así que una tabla de presentación es suficiente y evita una
  dependencia; se reevaluará si hace falta ordenamiento o selección en el cliente.
- **Lista responsive**: tabla en escritorio (`lg+`) y tarjetas en móvil, para la lista de tiquets.
- **Componentes compartidos**: `page-header.tsx` (título, descripción y acciones) y
  `empty-state.tsx` (estado vacío con acción e icono opcionales).
- **Insignias con tokens**: `StatusBadge` pasa a usar los tokens semánticos (`info`, `warning`,
  `success`, `destructive`), de modo que siguen el tema activo.
- **Detalle a dos columnas**: contenido (línea de tiempo y evidencias) a la izquierda; rail con
  acciones, captura, participantes, tiempos manuales y calificación a la derecha.

## Alternativas consideradas

- **TanStack Table:** potente, pero innecesaria mientras el orden y la paginación sean del
  servidor; añadirla sería abstraer antes de tiempo.
- **Mantener solo tarjetas:** no aprovecha el ancho ni permite escanear columnas.

## Consecuencias

- Listas densas y legibles en escritorio; móvil conserva las tarjetas.
- Los componentes de datos son reutilizables por administración y métricas.
- Si aparece la necesidad de ordenar o seleccionar en el cliente, se evalúa TanStack Table en un
  ADR nuevo.
