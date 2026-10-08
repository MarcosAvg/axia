import { createFileRoute } from '@tanstack/react-router'
import { RequirePermission } from '@/features/auth'
import { RolesManager } from '@/features/admin'

export const Route = createFileRoute('/_authenticated/admin/roles')({
  component: RolesPage,
})

function RolesPage() {
  return (
    <RequirePermission permission="role.manage">
      <RolesManager />
    </RequirePermission>
  )
}
