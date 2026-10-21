import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TextField } from '@/components/shared/form-fields'
import { changePassword } from '../api/auth-api'
import { authMessages } from '../i18n'

const schema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(12),
    confirmPassword: z.string().min(1),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: authMessages.password.errors.confirm,
  })

type FormValues = z.infer<typeof schema>

export function ChangePasswordScreen() {
  const [error, setError] = useState<string | null>(null)
  const form = useForm<FormValues>({ resolver: zodResolver(schema) })
  const {
    handleSubmit,
    formState: { isSubmitting },
  } = form

  const onSubmit = handleSubmit(async (values) => {
    setError(null)
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      window.location.assign('/')
    } catch {
      setError(authMessages.password.errors.unknown)
    }
  })

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{authMessages.password.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <PasswordFields form={form} />
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>{error}</AlertTitle>
              </Alert>
            ) : null}
            <Button type="submit" disabled={isSubmitting} className="min-h-11">
              {isSubmitting
                ? authMessages.password.submitting
                : authMessages.password.submit}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}

function PasswordFields({
  form,
}: {
  form: ReturnType<typeof useForm<FormValues>>
}) {
  const { register, formState } = form
  return (
    <>
      <TextField
        id="current-password"
        label={authMessages.password.current}
        type="password"
        autoComplete="current-password"
        error={formState.errors.currentPassword?.message}
        {...register('currentPassword')}
      />
      <TextField
        id="new-password"
        label={authMessages.password.new}
        type="password"
        autoComplete="new-password"
        error={formState.errors.newPassword?.message}
        {...register('newPassword')}
      />
      <TextField
        id="confirm-password"
        label={authMessages.password.confirm}
        type="password"
        autoComplete="new-password"
        error={formState.errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />
    </>
  )
}
