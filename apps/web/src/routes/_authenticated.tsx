import { createFileRoute } from '@tanstack/react-router'
import { AppShell, RequireAuth } from '@/features/auth'

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
