import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
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
  SetupForm,
  useAuth,
} from '@/features/auth'
import { fetchSetupStatus } from '@/features/auth/api/auth-api'
import { messages } from '@/lib/i18n'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const { status } = useAuth()
  const setup = useQuery({
    queryKey: ['setup', 'status'],
    queryFn: fetchSetupStatus,
    retry: false,
  })

  if (status === 'loading' || setup.isLoading) return <LoadingScreen />
  if (status === 'signed-in') return <Navigate to="/" replace />

  return (
    <main className="flex min-h-svh bg-background text-foreground">
      <aside className="hidden flex-1 flex-col bg-primary/5 p-10 lg:flex">
        <span className="text-2xl font-semibold tracking-tight">
          {messages.app.name}
        </span>
        <div className="my-auto flex flex-col gap-3">
          <h2 className="max-w-md text-3xl font-semibold tracking-tight">
            {messages.app.tagline}
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {authMessages.login.brandDescription}
          </p>
        </div>
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
            <CardTitle>
              {setup.data?.required
                ? authMessages.setup.title
                : authMessages.login.title}
            </CardTitle>
            <CardDescription>
              {setup.data?.required
                ? authMessages.setup.description
                : authMessages.login.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {setup.data?.required ? <SetupForm /> : <LoginForm />}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
