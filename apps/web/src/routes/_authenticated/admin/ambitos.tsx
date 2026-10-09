import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '@/components/shared/page-header'
import { adminMessages, ScopesManager } from '@/features/admin'
import { RequirePermission } from '@/features/auth'

export const Route = createFileRoute('/_authenticated/admin/ambitos')({
  component: ScopesPage,
})

function ScopesPage() {
  return (
    <RequirePermission permission="assignment.manage">
      <div className="flex flex-col gap-6">
        <PageHeader
          title={adminMessages.nav.scopes}
          description={adminMessages.descriptions.scopes}
        />
        <ScopesManager />
      </div>
    </RequirePermission>
  )
}
