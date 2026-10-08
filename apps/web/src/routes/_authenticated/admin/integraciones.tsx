import { createFileRoute } from '@tanstack/react-router'
import { RequirePermission } from '@/features/auth'
import { IntegrationManager } from '@/features/admin'

export const Route = createFileRoute('/_authenticated/admin/integraciones')({
  component: IntegrationsPage,
})

function IntegrationsPage() {
  return (
    <RequirePermission permission="data.import">
      <IntegrationManager />
    </RequirePermission>
  )
}
