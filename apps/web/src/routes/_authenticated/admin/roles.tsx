import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '@/components/shared/page-header'
import { adminMessages, RolesManager } from '@/features/admin'
import { RequirePermission } from '@/features/auth'

export const Route = createFileRoute('/_authenticated/admin/roles')({
  component: RolesPage,
})

function RolesPage() {
  return (
    <RequirePermission permission="role.manage">
      <div className="flex flex-col gap-6">
        <PageHeader
          title={adminMessages.nav.roles}
          description={adminMessages.descriptions.roles}
        />
        <RolesManager />
      </div>
    </RequirePermission>
  )
}
