/** Textos de la tarjeta de distribución y de las medidas robustas. */
export const distributionMessages = {
  distribution: 'Distribución y atípicos',
  distributionHint:
    'Cada fase se calcula sobre los tiquets que la tuvieron. La cobertura indica qué parte del periodo representa esa muestra.',
  sample: 'n',
  coverage: 'Cobertura',
  median: 'Mediana',
  iqr: 'IQR (P25–P75)',
  p90: 'P90',
  max: 'Máximo',
  outliers: 'Atípicos',
  mean: 'Media',
  insufficientSample: 'Muestra insuficiente: menos de 5 tiquets.',
  robustHint:
    'Medidas robustas: excluyen los tiquets sin la fase y no son aditivas.',
} as const
