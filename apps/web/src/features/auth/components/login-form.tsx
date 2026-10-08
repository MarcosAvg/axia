import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { TextField } from '@/components/shared/form-fields'
import { isInvalidCredentials } from '../domain/auth-error'
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
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null)
    try {
      await signIn(values.email, values.password)
    } catch (error) {
      setSubmitError(
        isInvalidCredentials(error)
          ? authMessages.login.errors.invalid
          : authMessages.login.errors.unknown,
      )
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <TextField
        id="email"
        label={authMessages.login.email}
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
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
