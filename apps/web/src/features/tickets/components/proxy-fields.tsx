import { SelectField } from '@/components/shared/form-fields'
import { ticketMessages } from '../i18n'

export function ProxySelector({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}) {
  if (options.length === 0) return null

  return (
    <div className="flex flex-col gap-1">
      <SelectField
        id="proxy-subject"
        label={ticketMessages.proxy.label}
        placeholder={ticketMessages.proxy.none}
        options={options}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <p className="hidden text-xs text-muted-foreground sm:block">
        {ticketMessages.proxy.help}
      </p>
    </div>
  )
}

export function ProxyRequiredHint({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <p role="status" className="text-sm text-muted-foreground">
      {ticketMessages.proxy.required}
    </p>
  )
}
