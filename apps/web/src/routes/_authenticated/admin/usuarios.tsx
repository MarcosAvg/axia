import { createFileRoute } from '@tanstack/react-router'
import { RequirePermission } from '@/features/auth'
import { UsersManager } from '@/features/admin'

export const Route = createFileRoute('/_authenticated/admin/usuarios')({
  component: UsersPage,
})

function UsersPage() {
  return (
    <RequirePermission permission="user.manage">
      <UsersManager />
    </RequirePermission>
  )
}
