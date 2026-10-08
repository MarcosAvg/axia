import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { authMessages } from '../i18n'

/** Aviso para cuando el usuario no tiene el permiso de la sección. */
export function ForbiddenCard() {
  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>{authMessages.forbidden.title}</CardTitle>
        <CardDescription>{authMessages.forbidden.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild className="min-h-11 w-full">
          <Link to="/">{authMessages.forbidden.action}</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
