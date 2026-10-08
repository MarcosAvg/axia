import { createFileRoute, Outlet } from '@tanstack/react-router'
import { RequirePermission } from '@/features/auth'
import { adminMessages } from '@/features/admin'

export const Route = createFileRoute('/_authenticated/admin')({
  component: AdminLayout,
})

function AdminLayout() {
  return (
    <RequirePermission permission="catalog.manage">
      <div className="flex flex-col gap-6">
        <header>
          <h1 className="text-xl font-semibold">{adminMessages.title}</h1>
          <p className="text-sm text-muted-foreground">
            {adminMessages.subtitle}
          </p>
        </header>
        <Outlet />
      </div>
    </RequirePermission>
  )
}
