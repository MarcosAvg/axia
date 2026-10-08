import { createFileRoute } from '@tanstack/react-router'
import { RequirePermission } from '@/features/auth'
import { CalendarManager } from '@/features/admin'

export const Route = createFileRoute('/_authenticated/admin/calendarios')({
  component: CalendarsPage,
})

function CalendarsPage() {
  return (
    <RequirePermission permission="catalog.manage">
      <CalendarManager />
    </RequirePermission>
  )
}
