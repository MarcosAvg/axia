import { createFileRoute } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { authMessages, roleLabel, useAuth } from '@/features/auth'

export const Route = createFileRoute('/_authenticated/')({
  component: DashboardPage,
})

function DashboardPage() {
  const { identity } = useAuth()
  const roles = identity?.roles ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {authMessages.dashboard.welcome}
          {identity ? `, ${identity.fullName}` : ''}
        </CardTitle>
        <CardDescription>{authMessages.dashboard.description}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm">
        <p className="font-medium">{authMessages.dashboard.roles}</p>
        {roles.length > 0 ? (
          <ul className="mt-1 list-inside list-disc text-muted-foreground">
            {roles.map((role) => (
              <li key={role}>{roleLabel(role)}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-muted-foreground">
            {authMessages.dashboard.noRoles}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
