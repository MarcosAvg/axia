import { createFileRoute } from '@tanstack/react-router'
import { AdminPage, adminMessages, UsersManager } from '@/features/admin'
import { RequirePermission } from '@/features/auth'

export const Route = createFileRoute('/_authenticated/admin/usuarios')({
  component: UsersPage,
})

function UsersPage() {
  return (
    <RequirePermission permission="user.manage">
      <AdminPage
        title={adminMessages.nav.users}
        description={adminMessages.descriptions.users}
      >
        <UsersManager />
      </AdminPage>
    </RequirePermission>
  )
}
