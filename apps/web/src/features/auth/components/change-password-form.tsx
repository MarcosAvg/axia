import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/shared/form-fields'
import { changePassword } from '../api/auth-api'
import { authMessages } from '../i18n'
import { changePasswordSchema } from '../schemas'
import type { ChangePasswordInput } from '../schemas'

function PasswordFields({
  form,
}: {
  form: ReturnType<typeof useForm<ChangePasswordInput>>
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

/** Formulario para cambiar la contraseña propia. */
export function ChangePasswordForm({ onSuccess }: { onSuccess?: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  })
  const {
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = form

  const onSubmit = handleSubmit(async (values) => {
    setError(null)
    setSaved(false)
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      reset()
      setSaved(true)
      onSuccess?.()
    } catch {
      setError(authMessages.password.errors.unknown)
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {authMessages.password.description}
      </p>
      <PasswordFields form={form} />
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      ) : null}
      {saved ? (
        <Alert>
          <AlertTitle>{authMessages.password.saved}</AlertTitle>
        </Alert>
      ) : null}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="min-h-11 self-start"
      >
        {isSubmitting
          ? authMessages.password.submitting
          : authMessages.password.submit}
      </Button>
    </form>
  )
}
