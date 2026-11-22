import { createFileRoute, Navigate } from '@tanstack/react-router'
import { can, useAuth } from '@/features/auth'
import { useOnline } from '@/lib/use-online'
import { Dashboard } from '@/features/dashboard'

export const Route = createFileRoute('/_authenticated/')({
  component: Home,
})

function Home() {
  const { identity, isOfflineSession } = useAuth()
  const online = useOnline()
  if (
    (!online || isOfflineSession) &&
    identity?.technicianId &&
    can(identity, 'ticket.view')
  )
    return <Navigate to="/mi-trabajo" replace />
  return <Dashboard />
}
