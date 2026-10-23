import { TextField } from '@/components/shared/form-fields'

/** Campo común para registrar la hora real de una acción. */
export function ActionTimeField({
  id = 'action-occurred-at',
  label = 'Hora real de la acción',
  value,
  onChange,
}: {
  id?: string
  label?: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <TextField
      id={id}
      label={label}
      type="datetime-local"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}
