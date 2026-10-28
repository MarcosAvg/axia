// Textos de métricas (es-MX).

import type { Dimension } from './domain/metrics'

export const dimensionLabels: Record<Dimension, string> = {
  team: 'Equipo',
  building: 'Edificio',
  category: 'Categoría',
  dependency: 'Dependencia',
  requester: 'Solicitante',
}

export const metricsMessages = {
  title: 'Métricas',
  subtitle: 'Indicadores de los tiquets que puedes ver.',
  health: 'Salud del periodo',
  sectionsNav: 'Secciones de métricas',
  loading: 'Cargando…',
  error: 'No se pudieron cargar las métricas.',
  empty: 'No hay datos con estos filtros.',
  filters: {
    title: 'Filtros',
    from: 'Desde',
    to: 'Hasta',
    building: 'Edificio',
    team: 'Equipo',
    category: 'Categoría',
    dependency: 'Dependencia',
    all: 'Todos',
    clear: 'Limpiar',
    remove: 'Quitar',
    range: 'Rango',
  },
  quickRanges: {
    d7: '7 días',
    d30: '30 días',
    d90: '90 días',
    all: 'Todo',
  },
  tabs: {
    summary: 'Resumen',
    times: 'Tiempos',
    quality: 'Calidad',
    sla: 'SLA y satisfacción',
    team: 'Equipo',
  },
  dimensions: {
    title: 'Dimensiones',
    viewBy: 'Ver por',
    count: (count: number) =>
      `${count} ${count === 1 ? 'agrupación' : 'agrupaciones'}`,
  },
  kpi: {
    tickets: 'Tiquets',
    active: 'Trabajo activo',
    activeExtra: 'Fuera de horario',
    total: 'Tiempo total',
    net: 'Tiempo neto',
    response: 'Respuesta',
    assignment: 'Asignación',
    validation: 'Validación',
    reassignment: 'Reasignación',
    recapture: 'Recaptura',
    reopen: 'Reapertura',
    firstFix: 'Primera resolución',
    satisfaction: 'Satisfacción',
    sla: 'Cumplimiento de SLA',
    reassignedTechnician: 'Reasignación de técnico',
  },
  kpiGroups: {
    carga: 'Carga',
    tiempos: 'Duración',
    sla: 'SLA y satisfacción',
  },
  kpiHints: {
    tickets: 'Número de tiquets con los filtros y el periodo activos.',
    active:
      'Trabajo activo por tiquet: del inicio a la atención, sin contar pausas.',
    activeExtra:
      'Trabajo fuera del horario laboral (noches, fines de semana o festivos).',
    total:
      'Tiempo total por tiquet: del registro al cierre, incluyendo pausas y esperas.',
    net: 'Tiempo neto: el total menos los tramos clasificados como no contables.',
    response: 'Del registro del tiquet a que el supervisor lo toma.',
    assignment: 'De la toma del supervisor a la asignación del técnico.',
    validation: 'De la atención del técnico a la validación o el cierre.',
    reassignment:
      'Porcentaje de tiquets en los que cambió el equipo o el supervisor.',
    recapture: 'Porcentaje de tiquets con al menos una recaptura registrada.',
    reopen:
      'Porcentaje de tiquets reabiertos (por reclamación procedente o reactivación).',
    firstFix: 'Porcentaje de tiquets cerrados sin reapertura posterior.',
    satisfaction:
      'Promedio de las calificaciones del solicitante (escala 1 a 5).',
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
    pauses: 'Número de pausas por motivo en el periodo.',
    routing:
      'Ofertas a supervisores: pendientes, tomadas y tiempo medio hasta la toma.',
    aging: 'Tiquets abiertos más antiguos, ordenados por tiempo transcurrido.',
    sla: 'Cumplimiento del tiempo objetivo por prioridad.',
    duplicatesByDimension:
      'Tasa de duplicados por agrupación: duplicados entre los tiquets.',
    rejectCancel: 'Tiquets rechazados o cancelados, desglosados por motivo.',
    techniciansChart: 'Tiquets por técnico en el periodo.',
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
  delta: {
    vsPrevious: 'vs periodo anterior',
    vs: 'vs',
    noData: 'Sin periodo previo',
  },
  sla: {
    title: 'Tiempos objetivo (SLA)',
    priority: 'Prioridad',
    withTarget: 'Con objetivo',
    met: 'Cumplidos',
    rate: 'Cumplimiento',
    target: 'Objetivo medio',
    resolution: 'Resolución media',
    empty: 'Sin tiquets con objetivo.',
    metHint:
      'Tiquets que cumplieron su tiempo objetivo, sobre el total con objetivo.',
    targetHint:
      'Tiempo objetivo medio de los tiquets con objetivo en el periodo.',
    summary: (met: number, withTarget: number, ratings: number) =>
      `${met} de ${withTarget} tiquets con objetivo cumplido · ${ratings} calificaciones.`,
  },
  charts: {
    volume: 'Tiquets por mes',
    ticketsBy: 'Tiquets',
    timesByDimension: 'Tiempos por dimensión',
    pauses: 'Pausas por motivo',
  },
  table: {
    dimension: 'Dimensión',
    name: 'Agrupación',
    tickets: 'Tiquets',
    avgActive: 'Trabajo activo',
    avgTotal: 'Tiempo total',
    extra: 'Fuera de horario',
    reassignment: 'Reasignación',
    recapture: 'Recaptura',
  },
  duplicates: {
    title: 'Duplicados',
    byDimension: 'Duplicados por dimensión',
    detail: 'Detalle por agrupación',
    timeToMark: 'Tiempo medio hasta marcarse',
    alerts: 'Alertas de posible duplicado',
    dimension: 'Dimensión',
    tickets: 'Tiquets',
    duplicates: 'Duplicados',
    rate: 'Tasa',
    decisions: {
      pending: 'Pendientes',
      ignored: 'Ignoradas',
      linked: 'Enlazadas',
      dismissed: 'Descartadas',
    },
  },
  aging: {
    title: 'Antigüedad de pendientes',
    ticket: 'Folio',
    status: 'Estado',
    age: 'Antigüedad',
  },
  technicians: {
    title: 'Carga por técnico',
    byTechnician: 'Tiquets por técnico',
    technician: 'Técnico',
    tickets: 'Tiquets',
    leader: 'Como líder',
    auxiliary: 'Como auxiliar',
    participation: 'Participación',
    extra: 'Fuera de horario',
    assigned: 'Asignados',
  },
  rejectCancel: {
    title: 'Rechazos y cancelaciones',
    event: 'Tipo',
    reason: 'Motivo',
    tickets: 'Tiquets',
    rejected: 'Rechazado',
    cancelled: 'Cancelado',
  },
  routing: {
    title: 'Ruteo y toma',
    offers: 'Ofertas',
    pending: 'Pendientes',
    taken: 'Tomadas',
    timeToTake: 'Tiempo hasta la toma',
  },
  export: 'Exportar CSV',
  exportXlsx: 'Exportar XLSX',
} as const
