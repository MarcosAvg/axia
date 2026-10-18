// Textos del panel de inicio (es-MX).

export const dashboardMessages = {
  greeting: 'Hola',
  subtitle: 'Tu resumen y tus bandejas.',
  error: 'No se pudo cargar el panel.',
  retry: 'Reintentar',
  actions: {
    newTicket: 'Nuevo tiquet',
    tickets: 'Ver tiquets',
    metrics: 'Métricas',
    admin: 'Administración',
  },
  kpi: {
    myWork: 'Mi trabajo',
    offers: 'Ofertas pendientes',
    active: 'Tiquets activos',
    inProgress: 'En curso',
    paused: 'En pausa',
    toValidate: 'Por validar',
    unassigned: 'Sin asignar',
    closed: 'Cerrados',
    activeTime: 'Trabajo activo',
    firstFix: 'Primera resolución',
    sla: 'Cumplimiento de SLA',
    satisfaction: 'Satisfacción',
  },
  charts: {
    volume: 'Tiquets por mes',
  },
  kpiHints: {
    myWork: 'Tiquets en los que participas actualmente.',
    offers: 'Tiquets registrados que esperan que los tomes.',
    active: 'Tiquets abiertos de la instancia (sin cerrar ni descartar).',
    inProgress: 'Tiquets que ya están en atención.',
    paused: 'Tiquets detenidos con una pausa abierta.',
    toValidate: 'Tiquets atendidos que esperan validación para cerrarse.',
    unassigned: 'Tiquets registrados que aún no tienen técnico asignado.',
    closed: 'Tiquets cerrados en el periodo consultado.',
    activeTime:
      'Trabajo activo por tiquet: del inicio a la atención, sin pausas.',
    firstFix: 'Porcentaje de tiquets cerrados sin reapertura posterior.',
    sla: 'Porcentaje de tiquets cerrados que cumplieron su tiempo objetivo.',
    satisfaction:
      'Promedio de las calificaciones del solicitante (escala 1 a 5).',
  },
  activity: {
    title: 'Actividad reciente',
    empty: 'Sin actividad.',
  },
  sections: {
    offers: 'Ofertas para ti',
    team: 'Tiquets del equipo',
    active: 'Tiquets activos',
    myActive: 'Tus tiquets activos',
  },
  viewAll: 'Ver todos',
  empty: {
    team: 'No hay tiquets activos.',
  },
} as const
