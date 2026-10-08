import { createFileRoute } from '@tanstack/react-router'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { authMessages, RequirePermission } from '@/features/auth'

export const Route = createFileRoute('/_authenticated/admin')({
  component: AdminPage,
})

function AdminPage() {
  return (
    <RequirePermission permission="user.manage">
      <Card>
        <CardHeader>
          <CardTitle>{authMessages.admin.title}</CardTitle>
          <CardDescription>{authMessages.admin.description}</CardDescription>
        </CardHeader>
      </Card>
    </RequirePermission>
  )
}
