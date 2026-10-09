import { createFileRoute, Navigate } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  authMessages,
  LoadingScreen,
  LoginForm,
  useAuth,
} from '@/features/auth'
import { messages } from '@/lib/i18n'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const { status } = useAuth()

  if (status === 'loading') return <LoadingScreen />
  if (status === 'signed-in') return <Navigate to="/" replace />

  return (
    <main className="flex min-h-svh bg-background text-foreground">
      <aside className="hidden flex-1 flex-col justify-between bg-primary/5 p-10 lg:flex">
        <span className="text-2xl font-semibold tracking-tight">
          {messages.app.name}
        </span>
        <div className="flex flex-col gap-3">
          <h2 className="max-w-md text-3xl font-semibold tracking-tight">
            {messages.app.tagline}
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {authMessages.login.brandDescription}
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {messages.app.name}
        </span>
      </aside>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
        <header className="flex flex-col items-center gap-1 text-center lg:hidden">
          <h1 className="text-2xl font-semibold tracking-tight">
            {messages.app.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {messages.app.tagline}
          </p>
        </header>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{authMessages.login.title}</CardTitle>
            <CardDescription>{authMessages.login.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
