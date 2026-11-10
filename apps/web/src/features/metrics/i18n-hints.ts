// Ayudas emergentes de los indicadores (es-MX).

export const hintMessages = {
  kpiHints: {
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
    countsByDimension:
      'Tiquets por agrupación, con su tasa de reasignación y de recaptura.',
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
  },
  tableHints: {
    dimensionTickets: 'Tiquets de la agrupación en el periodo.',
    avgActive: 'Trabajo activo de la agrupación en el periodo.',
    avgTotal: 'Tiempo total de la agrupación en el periodo.',
    extra: 'Trabajo de la agrupación fuera del horario laboral.',
    reassignment: 'Reasignaciones registradas en la agrupación.',
    recapture: 'Recapturas registradas en la agrupación.',
    participation:
      'Tiempo total participando, ya sea como líder o como auxiliar.',
    leader: 'Veces que el técnico fue líder de la atención.',
    auxiliary: 'Veces que el técnico participó como auxiliar.',
    assigned: 'Veces que el tiquet se le asignó como técnico.',
    duplicateRate: 'Duplicados entre los tiquets de la agrupación.',
    age: 'Tiempo transcurrido desde el registro.',
  },
  duplicateHints: {
    timeToMark: 'Tiempo medio desde el registro hasta marcar el duplicado.',
    alerts:
      'Tiquets señalados como posible duplicado, según la decisión tomada.',
  },
}
