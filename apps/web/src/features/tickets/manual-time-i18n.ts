// Textos de tiempos manuales (es-MX).

export const manualTimeMessages = {
  title: 'Tiempos manuales',
  help: 'Corrige el tramo abierto o registra un periodo que no se capturó en automático.',
  empty: 'Sin tiempos manuales registrados.',
  addMissing: 'Agregar tramo faltante',
  correct: 'Corregir tramo actual',
  current: 'Tramo actual',
  noCurrent: 'No hay un tramo abierto en este momento.',
  currentSince: 'Desde',
  open: 'En curso',
  automatic: 'Automático',
  manualOrigin: 'Manual',
  correctionHint:
    'El tramo original se conserva como historial y se reemplaza por esta corrección.',
  missingHint: 'Registra un periodo que no coincide con el tramo abierto.',
  endOptional: 'Fin (vacío si sigue abierto)',
  submit: 'Guardar tramo',
  submitting: 'Guardando…',
  void: 'Anular',
  voided: 'Anulado',
  fields: {
    kind: 'Tipo de tramo',
    technician: 'Técnico',
    startedAt: 'Inicio',
    endedAt: 'Fin',
    clockClass: 'Clasificación',
    selectPlaceholder: 'Selecciona…',
    noTechnician: 'Sin técnico asignado',
  },
  errors: {
    required: 'Completa tipo, inicio y fin.',
    endRequired: 'Indica el fin del tramo faltante.',
    order: 'El fin debe ser posterior al inicio.',
  },
} as const
