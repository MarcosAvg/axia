import { createFileRoute } from '@tanstack/react-router'
import { AdminPage, adminMessages, ScopesManager } from '@/features/admin'
import { RequirePermission } from '@/features/auth'

export const Route = createFileRoute('/_authenticated/admin/ambitos')({
  component: ScopesPage,
})

function ScopesPage() {
  return (
    <RequirePermission permission="assignment.manage">
      <AdminPage
        title={adminMessages.nav.scopes}
        description={adminMessages.descriptions.scopes}
      >
        <ScopesManager />
      </AdminPage>
    </RequirePermission>
  )
}
