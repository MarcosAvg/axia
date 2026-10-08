import { useNavigate } from '@tanstack/react-router'
import { ChevronDownIcon } from 'lucide-react'
import { OfflineIndicator } from '@/components/shared/offline-indicator'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '../hooks/auth-context'
import { authMessages } from '../i18n'

/** Menú del usuario: perfil, aviso offline y cerrar sesión. */
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            aria-label={authMessages.userMenu.label}
            className="min-h-11"
          >
            {identity?.fullName}
            <ChevronDownIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              void navigate({ to: '/perfil' })
            }}
          >
            {authMessages.nav.profile}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              void handleSignOut()
            }}
          >
            {authMessages.signOut}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
