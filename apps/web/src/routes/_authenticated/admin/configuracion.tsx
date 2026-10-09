import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '@/components/shared/page-header'
import { adminMessages, SettingsManager } from '@/features/admin'
import { RequirePermission } from '@/features/auth'

export const Route = createFileRoute('/_authenticated/admin/configuracion')({
  component: SettingsPage,
})

function SettingsPage() {
  return (
    <RequirePermission permission="catalog.manage">
      <div className="flex flex-col gap-6">
        <PageHeader
          title={adminMessages.nav.settings}
          description={adminMessages.descriptions.settings}
        />
        <SettingsManager />
      </div>
    </RequirePermission>
  )
}
