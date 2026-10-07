import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { messages } from '@/lib/i18n'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
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
          <CardTitle>{messages.home.welcome}</CardTitle>
          <CardDescription>{messages.home.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full">{messages.home.action}</Button>
        </CardContent>
      </Card>
    </main>
  )
}
