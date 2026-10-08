import { createFileRoute } from '@tanstack/react-router'
import { RequirePermission } from '@/features/auth'
import { MetricsDashboard } from '@/features/metrics'

export const Route = createFileRoute('/_authenticated/metricas')({
  component: MetricsPage,
})

function MetricsPage() {
  return (
    <RequirePermission permission="metrics.view">
      <MetricsDashboard />
    </RequirePermission>
  )
}
