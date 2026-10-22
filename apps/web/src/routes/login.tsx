import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ErrorAlert } from '@/components/shared/async-state'
import { Button } from '@/components/ui/button'
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
import { useDocumentTitle } from '@/lib/use-document-title'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function BrandPanel() {
  return (
    <aside className="hidden flex-1 flex-col bg-primary/5 p-10 lg:flex">
      <span className="text-2xl font-semibold tracking-tight">
        {messages.app.name}
      </span>
      <div className="my-auto flex flex-col gap-3">
        <h1 className="max-w-md text-3xl font-semibold tracking-tight">
          {messages.app.tagline}
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {authMessages.login.brandDescription}
        </p>
      </div>
    </aside>
  )
}

function AccessCard({ setupRequired }: { setupRequired: boolean }) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle as="h2">
          {setupRequired ? authMessages.setup.title : authMessages.login.title}
        </CardTitle>
        <CardDescription>
          {setupRequired
            ? authMessages.setup.description
            : authMessages.login.description}
        </CardDescription>
      </CardHeader>
      <CardContent>{setupRequired ? <SetupForm /> : <LoginForm />}</CardContent>
    </Card>
  )
}

function SetupStatusError({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="flex min-h-svh bg-background text-foreground">
      <BrandPanel />
      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle as="h2">{authMessages.login.setupStatusTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <ErrorAlert
              message={authMessages.login.errors.setupStatus}
              action={
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  onClick={onRetry}
                >
                  {authMessages.login.retry}
                </Button>
              }
            />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function LoginPage() {
  const { status } = useAuth()
  const setup = useQuery({
    queryKey: ['setup', 'status'],
    queryFn: fetchSetupStatus,
    retry: false,
  })
  useDocumentTitle(setup.data?.required ? 'Primer arranque' : 'Acceso')

  if (status === 'loading' || setup.isLoading) return <LoadingScreen />
  if (status === 'signed-in') return <Navigate to="/" replace />
  if (setup.isError)
    return <SetupStatusError onRetry={() => void setup.refetch()} />

  return (
    <main className="flex min-h-svh bg-background text-foreground">
      <BrandPanel />
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
        <header className="flex flex-col items-center gap-1 text-center lg:hidden">
          <h1 className="text-2xl font-semibold tracking-tight">
            {messages.app.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {messages.app.tagline}
          </p>
        </header>
        <AccessCard setupRequired={Boolean(setup.data?.required)} />
      </div>
    </main>
  )
}
