/** Textos de la tarjeta de distribución y de las medidas robustas. */
export const distributionMessages = {
  distribution: 'Distribución y atípicos',
  rangeLegend: 'Barra: P25–P75 · punto: mediana · línea: mediana → P90',
  rangeScale: 'Escala compartida',
  rangeP90Max: 'P90 más alto',
  rangeOverflow:
    'P95 y máximo pueden superar el eje; consulta el valor de la derecha.',
  valueDrillDown: {
    median: {
      primary: 'Hasta la mediana',
      alternate: 'Por encima de la mediana',
    },
    iqr: { primary: 'En el 50% central', alternate: 'Fuera del 50% central' },
    p90: { primary: 'Hasta el P90', alternate: 'Por encima del P90' },
    max: { primary: 'El máximo', alternate: 'Por debajo del máximo' },
    outliers: { primary: 'Atípicos', alternate: 'Dentro de las vallas' },
    mean: { primary: 'Hasta la media', alternate: 'Por encima de la media' },
  },
  valueDrillDownHint:
    'Abre la lista de tiquets de este valor; en el panel puedes invertir el criterio.',
  unclassified: 'Sin clasificar',
  distributionHint:
    'Perfil completo de cada fase: muestra, centro, dispersión y extremos. Los valores abren la lista de tiquets y el panel permite invertir el criterio. No cambia con la medida.',
  sample: 'n',
  sampleOfTotal: 'n / N',
  coverage: 'Cobertura',
  median: 'Mediana',
  p25: 'P25',
  p75: 'P75',
  iqr: 'IQR (P25–P75)',
  p90: 'P90',
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
