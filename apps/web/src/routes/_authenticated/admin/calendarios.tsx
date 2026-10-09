import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '@/components/shared/page-header'
import { adminMessages, CalendarManager } from '@/features/admin'
import { RequirePermission } from '@/features/auth'

export const Route = createFileRoute('/_authenticated/admin/calendarios')({
  component: CalendarsPage,
})

function CalendarsPage() {
  return (
    <RequirePermission permission="catalog.manage">
      <div className="flex flex-col gap-6">
        <PageHeader
          title={adminMessages.nav.calendars}
          description={adminMessages.descriptions.calendars}
        />
        <CalendarManager />
      </div>
    </RequirePermission>
  )
}
