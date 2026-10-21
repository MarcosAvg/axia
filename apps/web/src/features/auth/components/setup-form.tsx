import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/shared/form-fields'
import { setupAdmin } from '../api/auth-api'
import { authMessages } from '../i18n'
import { setupSchema, type SetupInput } from '../schemas'

export function SetupForm() {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const form = useForm<SetupInput>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      username: '',
      fullName: '',
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null)
    try {
      await setupAdmin(values)
      window.location.assign('/')
    } catch {
      setSubmitError(authMessages.setup.errors.unknown)
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <SetupFields form={form} />
      {submitError ? (
        <Alert variant="destructive">
          <AlertTitle>{submitError}</AlertTitle>
        </Alert>
      ) : null}
      <Button
        type="submit"
        disabled={form.formState.isSubmitting}
        className="min-h-11 w-full"
      >
        {form.formState.isSubmitting
          ? authMessages.setup.submitting
          : authMessages.setup.submit}
      </Button>
    </form>
  )
}

function SetupFields({
  form,
}: {
  form: ReturnType<typeof useForm<SetupInput>>
}) {
  const { register, formState } = form
  return (
    <>
      <TextField
        id="setup-username"
        label={authMessages.setup.username}
        autoComplete="username"
        error={formState.errors.username?.message}
        {...register('username')}
      />
      <TextField
        id="setup-full-name"
        label={authMessages.setup.fullName}
        autoComplete="name"
        error={formState.errors.fullName?.message}
        {...register('fullName')}
      />
      <TextField
        id="setup-password"
        label={authMessages.setup.password}
        type="password"
        autoComplete="new-password"
        error={formState.errors.password?.message}
        {...register('password')}
      />
      <TextField
        id="setup-confirm"
        label={authMessages.setup.confirmPassword}
        type="password"
        autoComplete="new-password"
        error={formState.errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />
    </>
  )
}
