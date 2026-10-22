import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDocumentTitle } from '@/lib/use-document-title'
import { authMessages } from '../i18n'
import { ChangePasswordForm } from './change-password-form'

export function ChangePasswordScreen() {
  useDocumentTitle(authMessages.password.title)

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{authMessages.password.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm
            onSuccess={() => {
              window.location.assign('/')
            }}
          />
        </CardContent>
      </Card>
    </main>
  )
}
