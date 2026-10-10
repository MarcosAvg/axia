import { createFileRoute } from '@tanstack/react-router'
import { AdminPage, adminMessages, RolesManager } from '@/features/admin'
import { RequirePermission } from '@/features/auth'

export const Route = createFileRoute('/_authenticated/admin/roles')({
  component: RolesPage,
})

function RolesPage() {
  return (
    <RequirePermission permission="role.manage">
      <AdminPage
        title={adminMessages.nav.roles}
        description={adminMessages.descriptions.roles}
      >
        <RolesManager />
      </AdminPage>
    </RequirePermission>
  )
}
