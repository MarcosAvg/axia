# 0090 — Tablero de métricas operativo, por preguntas y con varias formas de gráfica

- Fecha: 2026-10-28
- Estado: aceptada

## Contexto

El tablero tenía cinco pestañas con el mismo molde —franja de KPIs, barras y tabla— y repetía
los mismos datos en dos o tres lugares. Los filtros ocupaban una franja fija y los indicadores
eran tarjetas grandes. El modelo de datos, en cambio, ya ofrecía categorías, subcategorías,
problemas, ubicaciones, prioridad, canal, tipo de servicio, estados, subestados de pausa,
supervisores, técnicos y calificaciones; casi nada de eso se mostraba. El equipo pidió más
datos, más detalle y variedad de gráficas, no solo tablas.

## Decisión

- **Cinco pestañas por pregunta**: Resumen, Distribución, Tiempos, Calidad y Equipo. SLA y
  satisfacción se integran en Resumen; dejan de tener pestaña propia.
- **Contexto compacto**: periodo y filtros en popovers, exportación en un menú y chips solo
  cuando hay filtros activos.
- **Un dato, un lugar; una forma por tipo de dato**:
  - área para evolución;
  - barra apilada para estado y composición;
  - Sunburst para jerarquías (categoría → subcategoría → problema; edificio → ubicación);
  - ranking horizontal y barras dentro de tablas para distribuciones;
  - mapa de calor para categoría × fase y dimensión × tasas;
  - dispersión para riesgo y carga de técnicos;
  - Pareto para pausas;
  - bullet para SLA y gauge radial para satisfacción.
- **Distribución** es una sola vista con selector de las 12 dimensiones y tabla con porcentaje
  global, acumulado y del padre. Así no se crean doce tablas.
- **Estado actual**: se muestra el estado vigente de los tiquets del periodo, agrupado en seis
  familias y con el detalle de los once estados. No son transiciones históricas.
- **Pausas**: el Pareto usa el motivo; la tabla muestra el subestado de la cascada.
- **Tiempos**: todas las fases del ciclo (respuesta, asignación, reasignación, espera, activo,
  pausa, validación, reclamación, sin clasificar), tabla de fases, mapa de calor por categoría y
  tabla por dimensión con selector de medida.
- **Técnicos**: tiempos de los tiquets que lideró cada técnico; el trabajo activo no se reparte
  entre auxiliares, así que se atribuye al líder del tiquet.
- **Supervisores**: ofertas, tomadas, pendientes, retiradas, tiempo hasta la toma,
  reasignaciones y validaciones.
- **Equipo**: resumen por equipo, supervisión y técnicos con un selector de vista.
- **Datos en la frontera**: los resúmenes agrupan las doce dimensiones en una sola consulta;
  los conteos de pg se normalizan en la API web y en `mergeBy`. No hay migración de esquema:
  las consultas nuevas viven en el servicio.

## Consecuencias

- Nuevos endpoints: `technician-times`, `supervisors` y `pause-substates`. El resumen incluye
  las doce dimensiones, la calidad por grupo, todos los intervalos y la distribución de
  satisfacción.
- Se retiran las tarjetas de KPI (`metric-card`, `metrics-kpis`, `metrics-hero`), las gráficas
  duplicadas y la pestaña SLA.
- La regresión visual cubre Resumen, Distribución (incluida la jerarquía), Tiempos, Calidad,
  Equipo y Supervisores a 1280 px; Resumen a 1440 px y Resumen a 390 px.
- Los medidores de calidad son neutros: no se inventan umbrales de bueno/malo; los deltas
  conservan `lowerIsBetter`.
- El coste inicial crece con las doce dimensiones. El resumen se carga una vez y las consultas
  de técnicos y supervisores van en paralelo; si el histórico crece, el siguiente paso es
  paginar o cargar la dimensión elegida bajo demanda.
- Con un solo mes de datos, el volumen muestra una cifra y una nota; la tendencia aparece con
  dos o más meses.
