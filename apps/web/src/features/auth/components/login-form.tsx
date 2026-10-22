import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { TextField } from '@/components/shared/form-fields'
import { isInvalidCredentials, lockoutMinutes } from '../domain/auth-error'
import { useAuth } from '../hooks/auth-context'
import { authMessages } from '../i18n'
import { loginSchema } from '../schemas'
import type { LoginInput } from '../schemas'

/** Formulario de acceso con correo y contraseña. */
export function LoginForm() {
  const { signIn } = useAuth()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null)
    try {
      await signIn(values.username, values.password)
    } catch (error) {
      const minutes = lockoutMinutes(error)
      setSubmitError(
        minutes !== null
          ? authMessages.login.errors.locked(minutes)
          : isInvalidCredentials(error)
            ? authMessages.login.errors.invalid
            : authMessages.login.errors.unknown,
      )
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <TextField
        id="username"
        label={authMessages.login.username}
        autoComplete="username"
        error={errors.username?.message}
        {...register('username')}
      />
      <TextField
        id="password"
        label={authMessages.login.password}
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />
      {submitError ? (
        <Alert variant="destructive">
          <AlertTitle>{submitError}</AlertTitle>
        </Alert>
      ) : null}
      <Button type="submit" disabled={isSubmitting} className="min-h-11 w-full">
        {isSubmitting
          ? authMessages.login.submitting
          : authMessages.login.submit}
      </Button>
    </form>
  )
}
