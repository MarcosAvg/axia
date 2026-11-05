import { toast } from 'sonner'
import { ErrorAlert, LoadingList } from '@/components/shared/async-state'
import {
  useInstanceSettings,
  useUpdateInstanceSettings,
} from '../hooks/use-settings'
import { adminMessages } from '../i18n'
import { SettingsForm } from './settings-form'

/** Configuración esencial de la instancia. */
export function SettingsManager() {
  const settings = useInstanceSettings()
  const update = useUpdateInstanceSettings()
  const { list } = adminMessages
  // Remontar el formulario cuando cambian los ajustes guardados evita usar
  // `reset`: el React Compiler memoiza los refs de RHF y `reset` dejaría los
  // campos sin registrar en la build. Al remontar, `useForm` arranca con los
  // valores nuevos y el estado queda limpio.
  const formKey = settings.data ? JSON.stringify(settings.data) : ''

  return (
    <div className="flex flex-col gap-4">
      {settings.isLoading ? <LoadingList rows={4} /> : null}
      {settings.isError ? <ErrorAlert message={list.error} /> : null}
      {settings.data ? (
        <SettingsForm
          key={formKey}
          settings={settings.data}
          isSaving={update.isPending}
          onSave={(values) =>
            update.mutate(values, {
              onSuccess: () => toast.success(adminMessages.settings.saved),
              onError: () => toast.error(adminMessages.actions.error),
            })
          }
        />
      ) : null}
      {update.isError ? (
        <ErrorAlert message={adminMessages.actions.error} />
      ) : null}
    </div>
  )
}
