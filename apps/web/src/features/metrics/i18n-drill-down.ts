export const drillDownMessages = {
  label: 'Ver tiquets',
  fallbackTitle: 'Tiquets del indicador',
  invert: 'Invertir',
  invertHint: 'Ver el complemento de este criterio.',
  count: (total: number) =>
    total === 1
      ? '1 tiquet con estos filtros'
      : `${total} tiquets con estos filtros`,
  empty: 'No hay tiquets que cumplan este indicador.',
  error: 'No se pudo cargar la lista de tiquets.',
  retry: 'Reintentar',
  fullList: 'Abrir en la lista completa',
  previous: 'Anterior',
  next: 'Siguiente',
  page: (page: number, total: number) => `Página ${page} de ${total}`,
  note: 'La lista usa los datos actuales del tablero; en pausas y percentiles puede no coincidir con el número exacto del agregado.',
} as const
