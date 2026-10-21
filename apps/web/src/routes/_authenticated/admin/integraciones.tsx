import { createFileRoute } from '@tanstack/react-router'
import { AdminPage, adminMessages } from '@/features/admin'
import { RequirePermission } from '@/features/auth'

export const Route = createFileRoute('/_authenticated/admin/integraciones')({
  component: IntegrationsPage,
})

function IntegrationsPage() {
  return (
    <RequirePermission permission="catalog.manage">
      <AdminPage
        title={adminMessages.nav.integrations}
        description={adminMessages.descriptions.integrations}
      >
        <p className="text-sm text-muted-foreground">
          Las importaciones e integraciones externas quedan deshabilitadas en
          esta versión. El núcleo de Axia funciona sin ellas.
        </p>
      </AdminPage>
    </RequirePermission>
  )
}
