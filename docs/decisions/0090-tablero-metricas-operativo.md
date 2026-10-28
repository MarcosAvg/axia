# 0090 — Tablero de métricas operativo y compacto

- Fecha: 2026-10-28
- Estado: aceptada

## Contexto

El tablero de métricas mezclaba el contexto (rango, filtros y vista de tiempos), una franja de
salud y cinco secciones con tarjetas de dimensión repetidas. En escritorio el resultado se leía
como un layout móvil estirado: controles de 44 px, pestañas a todo lo ancho, KPIs de 3 columnas con
filas huérfanas y secciones que solo cabían una por pantalla. El equipo lo usa sobre todo en
escritorio, aunque la vista debe seguir funcionando en móvil.

Se evaluó apilar las cinco secciones en una sola página con un índice de anclas y pestañas solo en
móvil. Se descartó: la navegación por pestañas ya es clara, evita duplicar paneles con
`useMediaQuery` y conserva las pruebas y el patrón de las demás pantallas.

## Decisión

- **Cinco pestañas** (`Resumen`, `Tiempos`, `Calidad`, `SLA y satisfacción`, `Equipo`) como
  navegación principal, con la franja de salud del periodo siempre visible encima.
- **Explorador de dimensiones** único: pestañas, gráfica y tabla, en lugar de una tarjeta por
  dimensión. Se elige `Equipo` por defecto.
- **Densidad de escritorio**: controles de 36 px a partir de `lg` y de 44 px por debajo (objetivo
  táctil en móvil); pestañas a su ancho de contenido; cinco KPIs en una fila desde `xl`; etiquetas
  de KPI con altura reservada para que los valores queden alineados.
- **Filtros** en una fila a partir de 1440 px: rangos rápidos, fechas, filtros de catálogo
  plegables y vista promedio/acumulado. Los chips solo aparecen con filtros activos.
- La vista de tiempos (`Promedio`/`Acumulado`) es global y se muestra junto a los filtros.

## Consecuencias

- El tablero usa el ancho disponible y reduce el desplazamiento vertical en escritorio; en móvil
  conserva objetivos táctiles y el apilado de una columna.
- Las capturas de regresión cubren ahora 1280 px, 1440 px y 390 px (`metricas.png`,
  `metricas-escritorio.png`, `metricas-movil.png`).
- No se añaden dependencias ni se cambia el contrato de la API: la compactación es de presentación.
