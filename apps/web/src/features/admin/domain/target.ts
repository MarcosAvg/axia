// Unidades del tiempo objetivo (SLA): se guarda en minutos, se captura en min/horas/días.

export type TargetUnit = 'minutes' | 'hours' | 'days'

export const TARGET_UNITS: TargetUnit[] = ['minutes', 'hours', 'days']

const FACTOR: Record<TargetUnit, number> = {
  minutes: 1,
  hours: 60,
  days: 1440,
}

/** Unidad más legible para un valor en minutos. */
export function deriveTargetUnit(minutes: number | null): TargetUnit {
  if (minutes && minutes > 0 && minutes % FACTOR.days === 0) return 'days'
  if (minutes && minutes > 0 && minutes % FACTOR.hours === 0) return 'hours'
  return 'minutes'
}

/** Cantidad a mostrar en la unidad dada a partir de los minutos. */
export function amountFor(minutes: number | null, unit: TargetUnit): string {
  if (minutes === null) return ''
  return String(minutes / FACTOR[unit])
}

/** Minutos a partir de la cantidad y la unidad; `null` si no es un número positivo. */
export function minutesFrom(amount: string, unit: TargetUnit): number | null {
  const parsed = Number(amount)
  if (!amount.trim() || !Number.isFinite(parsed) || parsed <= 0) return null
  return Math.round(parsed * FACTOR[unit])
}

/** Texto legible de un objetivo en minutos. */
export function formatTargetMinutes(minutes: number | null): string {
  if (minutes === null || minutes <= 0) return '—'
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60
  const parts: string[] = []
  if (days) parts.push(`${days} d`)
  if (hours) parts.push(`${hours} h`)
  if (mins) parts.push(`${mins} min`)
  return parts.join(' ')
}
