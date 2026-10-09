import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '@/components/shared/page-header'
import { adminMessages, UsersManager } from '@/features/admin'
import { RequirePermission } from '@/features/auth'

export const Route = createFileRoute('/_authenticated/admin/usuarios')({
  component: UsersPage,
})

function UsersPage() {
  return (
    <RequirePermission permission="user.manage">
      <div className="flex flex-col gap-6">
        <PageHeader
          title={adminMessages.nav.users}
          description={adminMessages.descriptions.users}
        />
        <UsersManager />
      </div>
    </RequirePermission>
  )
}
