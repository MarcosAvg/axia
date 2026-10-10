import { createFileRoute } from '@tanstack/react-router'
import { AdminPage, adminMessages, CalendarManager } from '@/features/admin'
import { RequirePermission } from '@/features/auth'

export const Route = createFileRoute('/_authenticated/admin/calendarios')({
  component: CalendarsPage,
})

function CalendarsPage() {
  return (
    <RequirePermission permission="catalog.manage">
      <AdminPage
        title={adminMessages.nav.calendars}
        description={adminMessages.descriptions.calendars}
      >
        <CalendarManager />
      </AdminPage>
    </RequirePermission>
  )
}
