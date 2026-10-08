import { authMessages } from '../i18n'

/** Pantalla de espera mientras se resuelve la sesión. */
export function LoadingScreen() {
  return (
    <div
      role="status"
      className="flex min-h-svh items-center justify-center bg-background p-6 text-sm text-muted-foreground"
    >
      {authMessages.loading}
    </div>
  )
}
