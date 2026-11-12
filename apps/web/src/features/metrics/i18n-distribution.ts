/** Textos de la tarjeta de distribución y de las medidas robustas. */
export const distributionMessages = {
  distribution: 'Distribución y atípicos',
  distributionHint:
    'Perfil completo de cada fase: muestra, centro, dispersión y extremos. No cambia con la medida.',
  sample: 'n',
  sampleOfTotal: 'n / N',
  coverage: 'Cobertura',
  median: 'Mediana',
  iqr: 'IQR (P25–P75)',
  p90: 'P90',
  p95: 'P95',
  max: 'Máximo',
  outliers: 'Atípicos',
  mean: 'Media',
  active: 'activa',
  activeNote: 'La columna resaltada corresponde a la medida elegida.',
  sampleNote:
    'n mide cuántos tiquets tuvieron la fase; no cambia al elegir mediana, P90 o máximo.',
  accumulatedNote:
    'El acumulado no tiene una columna equivalente en el perfil; consulta la tabla de fases.',
  insufficientSample: 'Muestra insuficiente: menos de 5 tiquets.',
  robustHint:
    'Medidas robustas: excluyen los tiquets sin la fase y no son aditivas.',
} as const
