import { createFileRoute } from '@tanstack/react-router'
import { AdminPage, adminMessages, IntegrationManager } from '@/features/admin'
import { RequirePermission } from '@/features/auth'
import { ImportPanel } from '@/features/integrations'

export const Route = createFileRoute('/_authenticated/admin/integraciones')({
  component: IntegrationsPage,
})

function IntegrationsPage() {
  return (
    <RequirePermission permission="data.import">
      <AdminPage
        title={adminMessages.nav.integrations}
        description={adminMessages.descriptions.integrations}
      >
        <ImportPanel />
        <IntegrationManager />
      </AdminPage>
    </RequirePermission>
  )
}
