import { Button } from '@/components/ui/button'
import { metricsMessages } from '../i18n'
import { TIME_MODES, type TimeMode } from '../domain/time-mode'

export function TimeModeToggle({
  mode,
  onChange,
}: {
  mode: TimeMode
  onChange: (mode: TimeMode) => void
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-1 rounded-lg bg-muted/50 p-1"
      role="group"
      aria-label={metricsMessages.timeMode.label}
    >
      {TIME_MODES.map((value) => (
        <Button
          key={value}
          type="button"
          size="sm"
          variant={mode === value ? 'secondary' : 'ghost'}
          aria-pressed={mode === value}
          className="min-h-9 px-3"
          onClick={() => onChange(value)}
        >
          {metricsMessages.timeMode[value]}
        </Button>
      ))}
    </div>
  )
}
