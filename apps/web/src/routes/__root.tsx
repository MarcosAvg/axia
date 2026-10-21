import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { messages } from '@/lib/i18n'
import { useDocumentTitle } from '@/lib/use-document-title'

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
})

function RootLayout() {
  return <Outlet />
}

function NotFoundPage() {
  useDocumentTitle(messages.notFound.title)

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6 text-foreground">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{messages.notFound.title}</CardTitle>
          <CardDescription>{messages.notFound.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="min-h-11 w-full">
            <Link to="/">{messages.notFound.action}</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
