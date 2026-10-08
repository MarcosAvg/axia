import { ErrorAlert } from '@/components/shared/async-state'
import { adminMessages } from '../i18n'
import {
  useInstanceSettings,
  useUpdateInstanceSettings,
} from '../hooks/use-settings'
import { SettingsForm } from './settings-form'

/** Configuración esencial de la instancia. */
export function SettingsManager() {
  const settings = useInstanceSettings()
  const update = useUpdateInstanceSettings()
  const { settings: t, list } = adminMessages

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-medium">{t.title}</h2>
      {settings.isLoading ? (
        <p className="text-sm text-muted-foreground">{list.loading}</p>
      ) : null}
      {settings.isError ? <ErrorAlert message={list.error} /> : null}
      {settings.data ? (
        <SettingsForm
          settings={settings.data}
          isSaving={update.isPending}
          onSave={(values) => update.mutate(values)}
        />
      ) : null}
      {update.isSuccess ? (
        <p role="status" className="text-sm text-muted-foreground">
          {t.saved}
        </p>
      ) : null}
      {update.isError ? (
        <ErrorAlert message={adminMessages.actions.error} />
      ) : null}
    </div>
  )
}
