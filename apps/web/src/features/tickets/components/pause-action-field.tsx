import { SelectField } from '@/components/shared/form-fields'
import type { TicketPauseOption } from '../domain/types'
import { pauseMessages } from '../pause-i18n'

/** Selector de una opción habilitada desde el subestado actual de la pausa. */
export function PauseActionField({
  action,
  options,
  value,
  error,
  onChange,
}: {
  action: 'resume' | 'advance_pause'
  options: TicketPauseOption[]
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {action === 'resume' ? pauseMessages.noExits : pauseMessages.noAdvances}
      </p>
    )
  }
  return (
    <SelectField
      id="action-pause-option"
      label={action === 'resume' ? pauseMessages.exit : pauseMessages.next}
      placeholder="Selecciona…"
      options={options.map((option) => ({
        value: option.id,
        label: option.name,
      }))}
      value={value}
      error={error}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}
