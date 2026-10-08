import { createFileRoute } from '@tanstack/react-router'
import { RequirePermission } from '@/features/auth'
import { SettingsManager } from '@/features/admin'

export const Route = createFileRoute('/_authenticated/admin/configuracion')({
  component: SettingsPage,
})

function SettingsPage() {
  return (
    <RequirePermission permission="catalog.manage">
      <SettingsManager />
    </RequirePermission>
  )
}
