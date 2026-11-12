// Punto de entrada público del feature de métricas.

export { MetricsDashboard } from './components/metrics-dashboard'
export { useMetricsSummary, useSla, useSatisfaction } from './hooks/use-metrics'
export { formatMonthLabel } from './domain/period'
export {
  EMPTY_FILTERS,
  formatMinutes,
  formatPercent,
  formatRate,
  formatScore,
} from './domain/metrics'
export type {
  SatisfactionSummary,
  SlaSummary,
  VolumePoint,
} from './domain/metrics'
