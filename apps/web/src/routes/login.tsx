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
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 text-foreground">
      <header className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {messages.app.name}
        </h1>
        <p className="text-sm text-muted-foreground">{messages.app.tagline}</p>
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
    </main>
  )
}
