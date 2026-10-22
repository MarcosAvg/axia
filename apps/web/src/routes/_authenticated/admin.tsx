import { createFileRoute, Outlet } from '@tanstack/react-router'
import { RequireAnyPermission } from '@/features/auth'

export const Route = createFileRoute('/_authenticated/admin')({
  component: AdminLayout,
})

function AdminLayout() {
  return (
    <RequireAnyPermission
      permissions={[
        'catalog.manage',
        'user.manage',
        'role.manage',
        'assignment.manage',
      ]}
    >
      <Outlet />
    </RequireAnyPermission>
  )
}
