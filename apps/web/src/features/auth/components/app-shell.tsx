import { Link, Outlet, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { messages } from '@/lib/i18n'
import { can } from '../domain/identity'
import { useAuth } from '../hooks/auth-context'
import { authMessages } from '../i18n'

const navLinkClass =
  'inline-flex min-h-11 items-center px-1 text-sm text-muted-foreground hover:text-foreground [&.active]:font-semibold [&.active]:text-foreground'

/** Armazón de la aplicación autenticada: cabecera, navegación y salida. */
export function AppShell() {
  const { identity, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    await navigate({ to: '/login' })
  }

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-1 p-4">
          <Link to="/" className="text-lg font-semibold">
            {messages.app.name}
          </Link>
          <nav
            aria-label={authMessages.nav.label}
            className="flex items-center gap-4"
          >
            <Link to="/" className={navLinkClass}>
              {authMessages.nav.home}
            </Link>
            <Link to="/tickets" search={{ page: 1 }} className={navLinkClass}>
              {authMessages.nav.tickets}
            </Link>
            <Link to="/perfil" className={navLinkClass}>
              {authMessages.nav.profile}
            </Link>
            {can(identity, 'user.manage') && (
              <Link to="/admin" className={navLinkClass}>
                {authMessages.nav.admin}
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-3">
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
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 p-4">
        <Outlet />
      </main>
    </div>
  )
}
