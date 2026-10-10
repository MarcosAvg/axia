import { createFileRoute } from '@tanstack/react-router'
import { AdminPage, adminMessages, SettingsManager } from '@/features/admin'
import { RequirePermission } from '@/features/auth'

export const Route = createFileRoute('/_authenticated/admin/configuracion')({
  component: SettingsPage,
})

function SettingsPage() {
  return (
    <RequirePermission permission="catalog.manage">
      <AdminPage
        title={adminMessages.nav.settings}
        description={adminMessages.descriptions.settings}
      >
        <SettingsManager />
      </AdminPage>
    </RequirePermission>
  )
}
