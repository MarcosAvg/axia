import { Switch } from '@/components/ui/switch'
import { adminMessages } from '../i18n'

interface StatusSwitchProps {
  active: boolean
  name: string
  disabled?: boolean
  onToggle: () => void
}

/** Interruptor de activo/inactivo con etiqueta accesible. */
export function StatusSwitch({
  active,
  name,
  disabled,
  onToggle,
}: StatusSwitchProps) {
  const action = active
    ? adminMessages.actions.deactivate
    : adminMessages.actions.activate
  return (
    <Switch
      checked={active}
      disabled={disabled}
      aria-label={`${action}: ${name}`}
      onCheckedChange={() => onToggle()}
    />
  )
}
