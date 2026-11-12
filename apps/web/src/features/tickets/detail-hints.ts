// Explicaciones de las secciones del detalle del tiquet (es-MX).

export const detailSectionHints = {
  actions: 'Acciones disponibles según el estado del tiquet y tus permisos.',
  capture:
    'Datos con los que se registró el tiquet: ubicación, clasificación, prioridad y solicitante.',
  cycleTimes:
    'Fases con tiempo, de mayor a menor. La reasignación se mide aparte y puede solaparse; lo que no cae en una fase se muestra como sin clasificar.',
  cycleReassignment:
    'Tiempo con un supervisor equivocado. Se mide aparte y puede solaparse con otras fases.',
  cycleUnclassified: 'Tiempo del total que no cae en una fase medida.',
  evidence:
    'Fotos o archivos del ciclo de atención: solicitud, antes, avance, después y reclamación.',
  attachments:
    'Documentos obligatorios del problema, guardados aparte de las evidencias.',
  participants: 'Técnicos que participan en la atención: líder y auxiliares.',
  times:
    'Tiempos registrados a mano, con la persona y el momento en que se capturaron.',
  rating: 'Calificación de satisfacción del solicitante (escala 1 a 5).',
} as const
