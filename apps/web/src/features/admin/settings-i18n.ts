/** Textos de la configuración de la instancia. */
export const settingsMessages = {
  title: 'Configuración de la instancia',
  teamLabel: 'Etiqueta de equipo',
  validationPolicy: 'Política de validación',
  autoValidationDays: 'Días para validación automática (vacío = apagada)',
  claimWindowDays: 'Ventana de reclamación (días)',
  evidencePolicy: 'Política de evidencia al registrar',
  folioPattern: 'Patrón de folio',
  folioExample: 'Ejemplo con el patrón actual: AX-2026-001',
  timezone: 'Zona horaria',
  defaultCalendar: 'Calendario laboral por defecto',
  slaClockMode: 'Modo de reloj de los objetivos (SLA)',
  defaultPriority: 'Prioridad por defecto',
  requesterVisibleEvents: 'Eventos visibles al solicitante',
  requesterVisibleEventsHelp:
    'Elige qué tipos de evento ve el solicitante en la línea de tiempo. Las notas internas nunca se muestran.',
  requesterVisibleEventsError: 'Elige al menos un tipo de evento.',
  saved: 'Configuración guardada.',
  unsaved: 'Hay cambios sin guardar en la configuración.',
  sections: {
    general: 'General',
    validation: 'Validación y evidencia',
    time: 'Tiempos y SLA',
    visibility: 'Visibilidad del solicitante',
  },
} as const
