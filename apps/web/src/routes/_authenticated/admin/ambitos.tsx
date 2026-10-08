import { createFileRoute } from '@tanstack/react-router'
import { RequirePermission } from '@/features/auth'
import { ScopesManager } from '@/features/admin'

export const Route = createFileRoute('/_authenticated/admin/ambitos')({
  component: ScopesPage,
})

function ScopesPage() {
  return (
    <RequirePermission permission="assignment.manage">
      <ScopesManager />
    </RequirePermission>
  )
}
