import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import type { Identity } from '../domain/identity'
import { useUpdateProfile } from '../hooks/use-update-profile'
import { authMessages } from '../i18n'
import { profileSchema } from '../schemas'
import type { ProfileInput } from '../schemas'
import { TextField } from './text-field'

/** Formulario para editar el nombre y el teléfono del perfil propio. */
export function ProfileForm({ identity }: { identity: Identity }) {
  const mutation = useUpdateProfile()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: identity.fullName,
      phone: identity.phone ?? '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    const phone = values.phone?.trim() ? values.phone.trim() : null
    try {
      await mutation.mutateAsync({ fullName: values.fullName, phone })
    } catch {
      // El estado de la mutación (`mutation.isError`) muestra el error.
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <TextField
        id="fullName"
        label={authMessages.profile.fullName}
        autoComplete="name"
        error={errors.fullName?.message}
        {...register('fullName')}
      />
      <TextField
        id="phone"
        label={authMessages.profile.phone}
        type="tel"
        autoComplete="tel"
        error={errors.phone?.message}
        {...register('phone')}
      />
      {mutation.isSuccess ? (
        <p role="status" className="text-sm text-muted-foreground">
          {authMessages.profile.saved}
        </p>
      ) : null}
      {mutation.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {authMessages.profile.errors.unknown}
        </p>
      ) : null}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="min-h-11 w-full sm:w-auto"
      >
        {isSubmitting
          ? authMessages.profile.saving
          : authMessages.profile.submit}
      </Button>
    </form>
  )
}
