import { useNavigate } from '@tanstack/react-router'
import { OfflineIndicator } from '@/components/shared/offline-indicator'
import { Button } from '@/components/ui/button'
import { useAuth } from '../hooks/auth-context'
import { authMessages } from '../i18n'

/** Nombre del usuario, aviso offline y cerrar sesión. */
export function UserMenu() {
  const { identity, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    await navigate({ to: '/login' })
  }

  return (
    <div className="flex items-center gap-3">
      <OfflineIndicator />
      <span className="text-sm text-muted-foreground">
        {identity?.fullName}
      </span>
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        onClick={handleSignOut}
      >
        {authMessages.signOut}
      </Button>
    </div>
  )
}
