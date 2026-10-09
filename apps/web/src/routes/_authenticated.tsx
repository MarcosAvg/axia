import { createFileRoute } from '@tanstack/react-router'
import { RequireAuth } from '@/features/auth'
import { AppShell } from '@/features/shell'

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return (
    <RequireAuth>
      <AppShell />
    </RequireAuth>
  )
}
