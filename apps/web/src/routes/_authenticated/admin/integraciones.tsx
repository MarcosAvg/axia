import { createFileRoute } from '@tanstack/react-router'
import { RequirePermission } from '@/features/auth'
import { IntegrationManager } from '@/features/admin'
import { ImportPanel } from '@/features/integrations'

export const Route = createFileRoute('/_authenticated/admin/integraciones')({
  component: IntegrationsPage,
})

function IntegrationsPage() {
  return (
    <RequirePermission permission="data.import">
      <div className="flex flex-col gap-8">
        <ImportPanel />
        <IntegrationManager />
      </div>
    </RequirePermission>
  )
}
