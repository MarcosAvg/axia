import { createFileRoute, Outlet } from '@tanstack/react-router'
import { RequirePermission } from '@/features/auth'

export const Route = createFileRoute('/_authenticated/admin')({
  component: AdminLayout,
})

function AdminLayout() {
  return (
    <RequirePermission permission="catalog.manage">
      <Outlet />
    </RequirePermission>
  )
}
