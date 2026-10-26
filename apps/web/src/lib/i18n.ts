export const messages = {
  app: {
    name: 'Axia',
    tagline: 'Seguimiento de tiquets de mantenimiento',
  },
  home: {
    welcome: 'Bienvenido',
    description: 'Aquí verás el estado de cada tiquet y en qué se detiene.',
    action: 'Comenzar',
  },
  notFound: {
    title: 'No encontrado',
    description: 'La página que buscas no existe o se movió.',
    action: 'Volver al inicio',
  },
  pwa: {
    updateAvailable: 'Hay una nueva versión disponible.',
    updateAction: 'Actualizar',
    offlineReady: 'La aplicación está lista para usarse sin conexión.',
    dismissAction: 'Cerrar',
  },
  offline: {
    disconnected: 'Sin conexión',
    pending: (count: number) => `${count} por sincronizar`,
    failed: (count: number) => `${count} sin enviar`,
    failedTitle: 'Cambios sin enviar',
    failedDescription:
      'Estos cambios no se pudieron guardar en el servidor. Revisa el mensaje y decide si reintentar o descartar.',
    retry: 'Reintentar',
    discard: 'Descartar',
    action: 'Acción del tiquet',
    evidence: 'Evidencia',
  },
  fileField: {
    takePhoto: 'Tomar foto',
    chooseFile: 'Elegir archivo',
    replace: 'Sustituir',
    remove: 'Quitar',
  },
  theme: {
    aria: 'Cambiar tema y modo',
    colorLabel: 'Tema de color',
    modeLabel: 'Modo',
    themes: {
      ocean: 'Océano',
      neutral: 'Neutro',
      emerald: 'Esmeralda',
      violet: 'Violeta',
      contrast: 'Alto contraste',
    },
    modes: {
      light: 'Claro',
      dark: 'Oscuro',
      system: 'Sistema',
    },
  },
  aggregation: {
    label: 'Vista de tiempos',
    aria: 'Cambiar la vista de tiempos entre promedio y acumulado',
    average: 'Promedio',
    total: 'Acumulado',
    totalTag: 'acumulado',
    averageHint: 'Promedio por tiquet en el periodo.',
    totalHint: 'Suma (acumulado) de todos los tiquets del periodo.',
  },
} as const
