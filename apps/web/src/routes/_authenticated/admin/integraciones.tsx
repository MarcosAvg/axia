import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '@/components/shared/page-header'
import { adminMessages, IntegrationManager } from '@/features/admin'
import { RequirePermission } from '@/features/auth'
import { ImportPanel } from '@/features/integrations'

export const Route = createFileRoute('/_authenticated/admin/integraciones')({
  component: IntegrationsPage,
})

function IntegrationsPage() {
  return (
    <RequirePermission permission="data.import">
      <div className="flex flex-col gap-8">
        <PageHeader
          title={adminMessages.nav.integrations}
          description={adminMessages.descriptions.integrations}
        />
        <ImportPanel />
        <IntegrationManager />
      </div>
    </RequirePermission>
  )
}
