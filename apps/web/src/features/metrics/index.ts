// Punto de entrada público del feature de métricas.

export { MetricsDashboard } from './components/metrics-dashboard'
export { TicketCycleChart } from './components/cycle-bar'
export { useMetricsSummary, useSla, useSatisfaction } from './hooks/use-metrics'
export { formatMonthLabel } from './domain/period'
export {
  EMPTY_FILTERS,
  EMPTY_SUMMARY,
  formatMinutes,
  formatPercent,
  formatRate,
  formatScore,
} from './domain/metrics'
export type {
  MetricsSummary,
  SatisfactionSummary,
  SlaSummary,
  VolumePoint,
} from './domain/metrics'
