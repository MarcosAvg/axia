// Ayudas emergentes de los indicadores (es-MX).

export const hintMessages = {
  kpiHints: {
    ticketsTotal: 'Tiquets registrados en el periodo con los filtros activos.',
    activeTickets:
      'Tiquets que siguen en flujo: registrados, con supervisor, asignados, en proceso, pausados, atendidos o en reclamación.',
    unassigned:
      'Tiquets registrados o con supervisor que todavía no tienen técnico asignado.',
    pausedTickets: 'Tiquets detenidos con una pausa abierta.',
    closedTickets: 'Tiquets cerrados después de cumplir la validación.',
    slaCompliance:
      'Porcentaje de tiquets cerrados que cumplieron su tiempo objetivo.',
    tickets: 'Número de tiquets con los filtros y el periodo activos.',
    open: 'Tiquets del periodo que siguen abiertos: registrados, asignados, en proceso, pausados, atendidos o en reclamación.',
    active:
      'Trabajo activo por tiquet: del inicio a la atención, sin contar pausas. Excluye duplicados y tiempo no verificado.',
    activeExtra:
      'Trabajo fuera del horario laboral (noches, fines de semana o festivos).',
    total:
      'Tiempo total por tiquet de todos los desenlaces: del registro al cierre, incluyendo pausas y esperas.',
    resolution:
      'Tiempo hasta la resolución de los tiquets cerrados; excluye duplicados y tiempo no verificado.',
    net: 'Tiempo neto: el total menos los tramos clasificados como no contables.',
    response: 'Del registro del tiquet a que el supervisor lo toma.',
    assignment: 'De la toma del supervisor a la asignación del técnico.',
    validation: 'De la atención del técnico a la validación o el cierre.',
    reassignment:
      'Porcentaje de tiquets en los que cambió el equipo o el supervisor.',
    recapture: 'Porcentaje de tiquets con al menos una recaptura registrada.',
    reopen: 'Porcentaje de tiquets reabiertos por una reclamación procedente.',
    firstFix: 'Porcentaje de tiquets cerrados sin reapertura posterior.',
    satisfaction: 'Promedio de calificaciones del solicitante (1 a 5).',
    sla: 'Porcentaje de tiquets cerrados que cumplieron su tiempo objetivo.',
    reassignedTechnician:
      'Porcentaje de tiquets en los que el técnico cambió después de la asignación.',
  },
  chartHints: {
    volume:
      'Tiquets registrados en cada mes del periodo (por fecha de reporte).',
    timesByDimension:
      'Tiempo por agrupación (equipo, edificio, categoría, dependencia o solicitante).',
    countsByDimension: 'Tiquets por agrupación en el periodo.',
    topCategories:
      'Categorías con más tiquets en el periodo, con su porcentaje del total.',
    status:
      'Estado actual de los tiquets del periodo, agrupado por etapa del flujo.',
    pauses: 'Número de pausas por motivo en el periodo.',
    routing:
      'Ofertas a supervisores: pendientes, tomadas y tiempo medio hasta la toma.',
    aging:
      'Tiquets abiertos más antiguos, ordenados por tiempo transcurrido; no se limita al periodo.',
    sla: 'Cumplimiento del tiempo objetivo por prioridad.',
    duplicatesByDimension:
      'Tasa de duplicados por agrupación: duplicados entre los tiquets.',
    rejectCancel: 'Tiquets rechazados o cancelados, desglosados por motivo.',
    outcomes:
      'Volumen y tiempo medio de cada desenlace: abiertos, cerrados, rechazados, cancelados y duplicados.',
    techniciansTable:
      'Carga y participación por técnico: tiquets como líder y auxiliar, y minutos de participación.',
    phaseTable:
      'Todas las fases del ciclo con la medida y el reloj activos. Los cuantiles no son aditivos.',
    phaseHeatmap:
      'Tiempo de cada fase por categoría. La intensidad es relativa a la columna.',
    cycle:
      'Composición del ciclo con la medida activa. La tabla de fases es la leyenda.',
    phaseProfile:
      'Distribución por fase: caja P25–P75, mediana y P90. Solo se muestran fases con muestra.',
    technicianTimes:
      'Tiempos de los tiquets que lideró cada técnico. Estas tablas usan promedios y no cambian con el selector Medida.',
    requesterTimes:
      'Tiempos de validación y reclamación atribuidos al solicitante. Usan promedios y no cambian con el selector Medida.',
    qualityHeatmap:
      'Tasas de reasignación, recaptura, reapertura y primera resolución por agrupación. La intensidad es relativa a la columna.',
    distribution:
      'Volumen, porcentaje, tiempos promedio y tasas de calidad por agrupación.',
  },
  tableHints: {
    dimensionTickets: 'Tiquets de la agrupación en el periodo.',
    avgActive: 'Promedio del trabajo activo de la agrupación en el periodo.',
    avgTotal: 'Promedio del tiempo total de la agrupación en el periodo.',
    extra: 'Trabajo de la agrupación fuera del horario laboral.',
    reassignment:
      'Porcentaje de tiquets de la agrupación con reasignación de supervisor.',
    recapture: 'Porcentaje de tiquets de la agrupación con recaptura.',
    participation:
      'Tiempo total participando, ya sea como líder o como auxiliar.',
    leader: 'Veces que el técnico fue líder de la atención.',
    auxiliary: 'Veces que el técnico participó como auxiliar.',
    assigned: 'Veces que el tiquet se le asignó como técnico.',
    duplicateRate: 'Duplicados entre los tiquets de la agrupación.',
    age: 'Tiempo transcurrido desde el registro.',
    share: 'Porcentaje de la agrupación sobre el total.',
    cumulative:
      'Porcentaje acumulado de las filas anteriores en el orden actual.',
    parent: 'Agrupación padre en la jerarquía.',
    parentShare: 'Porcentaje de la agrupación sobre su dimensión padre.',
    pauseCount: 'Pausas registradas en el subestado.',
    pauseTime: 'Tiempo total en pausa en el subestado, en reloj continuo.',
  },
  duplicateHints: {
    timeToMark: 'Tiempo medio desde el registro hasta marcar el duplicado.',
    alerts:
      'Tiquets señalados como posible duplicado, según la decisión tomada.',
  },
  timesHints: {
    header:
      'El reloj aplica a toda la pestaña. La medida afecta a las vistas de una sola medida; la distribución muestra varias a la vez.',
    measure:
      'Promedio y acumulado usan todos los tiquets. Mediana, P90, P95 y máximo excluyen los tiquets sin la fase y no son aditivos.',
    phaseValue:
      'Valor de la fase con la medida activa. Las medidas robustas excluyen los tiquets sin la fase.',
    share: 'Porcentaje de la fase sobre el tiempo total acumulado del periodo.',
    total: 'Tiempo total del periodo con la medida activa.',
    net: 'Tiempo neto: el total menos los tramos clasificados como no contables.',
    dimensionSample:
      'Tiquets que tuvieron la fase. La medida se oculta cuando la muestra es menor a 5.',
    dimensionMeasure:
      'Fase que se muestra en la tabla; la medida global decide cómo se resume.',
    unclassified:
      'Tiempo del periodo que no cae en una fase medida; suele ser reasignación medida aparte.',
    people: 'Estas tablas usan promedios y no cambian con el selector Medida.',
    insufficientSample:
      'Con menos de 5 tiquets, la mediana y los cuantiles no son representativos.',
  },
  distributionHints: {
    sample:
      'Tiquets que tuvieron la fase. No cambia con la medida: todas las columnas resumen la misma muestra.',
    coverage:
      'Proporción del universo de desempeño que tuvo la fase en el periodo.',
    median: 'Valor central: la mitad de la muestra quedó por debajo.',
    iqr: 'Rango del 50% central (P25–P75). Menos sensible a los extremos que el promedio.',
    p90: 'El 90% de la muestra quedó por debajo de este tiempo.',
    p95: 'El 95% de la muestra quedó por debajo; muestra mejor la cola.',
    max: 'El caso más largo de la muestra. Un solo tiquet puede moverlo.',
    outliers:
      'Tiquets fuera de la valla Q1−1.5·IQR / Q3+1.5·IQR. La tasa es sobre la muestra de la fase.',
    mean: 'Promedio de la muestra; se muestra para contrastar con la mediana.',
    active:
      'La columna resaltada corresponde a la medida elegida en la cabecera.',
  },
  filterHints: {
    period:
      'Periodo por fecha de registro. La antigüedad de pendientes no se limita al periodo.',
    filters:
      'Filtros de catálogo y desenlace. Nunca amplían el alcance de lo que puedes ver.',
    timeMode:
      'Continuo corre 24 horas; laboral solo dentro del calendario del equipo; extra es el trabajo fuera de ese horario.',
    dimension: 'Agrupación que usan las tablas y gráficas.',
    export:
      'Exporta las agrupaciones por dimensión con la medida y el reloj activos.',
  },
  teamHints: {
    supervisors:
      'Ofertas recibidas, tomadas, pendientes y retiradas, además de reasignaciones y validaciones.',
    auxiliary:
      'Horas de apoyo auxiliar por técnico y categoría. Sigue el reloj activo.',
    routing:
      'Ofertas a supervisores: pendientes, tomadas y tiempo hasta la toma en reloj continuo.',
    offers: 'Ofertas de tiquets recibidas como candidato.',
    load: 'Tomadas, pendientes y retiradas sobre las ofertas recibidas.',
    takeRate: 'Ofertas tomadas sobre el total de ofertas.',
    pendingRate: 'Ofertas que siguen pendientes sobre el total de ofertas.',
    timeToTake:
      'Tiempo medio desde la oferta hasta la toma, en reloj continuo.',
    reassigned: 'Tiquets que reasignó como supervisor.',
    validated: 'Tiquets que validó como supervisor.',
    technicianTickets: 'Tiquets en los que participó el técnico.',
    attributedActive:
      'Trabajo activo atribuido al técnico sujeto, no a quien registró la acción.',
    attributedPause: 'Tiempo en pausa atribuido al técnico sujeto.',
    attributedWait: 'Tiempo de espera de inicio atribuido al técnico sujeto.',
    requesterTickets: 'Tiquets del solicitante en el periodo.',
    requesterValidation:
      'Tiempo de validación atribuido al solicitante sujeto.',
    requesterClaim: 'Tiempo de reclamación atribuido al solicitante sujeto.',
  },
}
