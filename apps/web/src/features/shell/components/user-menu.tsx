import { useNavigate } from '@tanstack/react-router'
import { ChevronDownIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { authMessages, useAuth } from '@/features/auth'
import { shellMessages } from '../i18n'

function initialsOf(name: string | undefined): string {
  if (!name) return '?'
  const words = name.trim().split(/\s+/).filter(Boolean)
  return words
    .slice(0, 2)
    .map((word) => word[0]?.toLocaleUpperCase('es-MX') ?? '')
    .join('')
}

/** Menú del usuario: perfil y cerrar sesión. */
export function UserMenu() {
  const { identity, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    await navigate({ to: '/login' })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="size-11 gap-0 px-0 font-semibold sm:h-8 sm:w-auto sm:gap-1.5 sm:px-2.5 sm:font-medium"
          aria-label={shellMessages.userMenu.label}
        >
          <span className="sm:hidden" aria-hidden>
            {initialsOf(identity?.fullName)}
          </span>
          <span className="hidden max-w-40 truncate sm:inline">
            {identity?.fullName}
          </span>
          <ChevronDownIcon className="hidden sm:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => {
            void navigate({ to: '/perfil' })
          }}
        >
          {shellMessages.nav.profile}
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
  )
}
