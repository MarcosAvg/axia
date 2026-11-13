/** Textos del resumen de tiempo por fase del tiquet. */
export const cycleMessages = {
  total: 'Total',
  chart: 'Composición del ciclo',
  empty: 'Sin tiempos registrados.',
  reassignment:
    'Tiempo con un supervisor equivocado. Se mide aparte y puede solaparse con otras fases.',
  unclassified: 'Tiempo del total que no cae en una fase medida.',
  phases: {
    response: 'Respuesta',
    assignment: 'Asignación',
    pendingTake: 'Pendiente de toma',
    wait: 'Espera',
    active: 'Trabajo activo',
    pause: 'Pausa',
    dormant: 'Fuera de atención',
    validation: 'Validación',
    claim: 'Reclamación',
    reassignment: 'Reasignación',
    unclassified: 'Sin clasificar',
  },
} as const
