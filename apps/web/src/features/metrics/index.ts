// Punto de entrada público del feature de métricas.

export { MetricsDashboard } from './components/metrics-dashboard'
export { useMetricsTickets, useSla, useSatisfaction } from './hooks/use-metrics'
export { formatMonthLabel } from './domain/period'
export {
  EMPTY_FILTERS,
  formatMinutes,
  formatPercent,
  formatRate,
  formatScore,
  openAging,
  summarize,
  volumeByMonth,
} from './domain/metrics'
export type {
  AgingRow,
  MetricsSummary,
  MetricsTicket,
  SatisfactionSummary,
  SlaSummary,
} from './domain/metrics'
