export type TimeMode = 'calendar' | 'laboral' | 'extra'

export const TIME_MODES: TimeMode[] = ['calendar', 'laboral', 'extra']

const FIELD_SUFFIX: Record<TimeMode, string> = {
  calendar: '',
  laboral: 'Labor',
  extra: 'Extra',
}

function capitalize(value: string): string {
  return value[0]?.toUpperCase() + value.slice(1)
}

/** Valor de una fase para el modo y la agregación activos. */
export function modeValue(
  row: Record<string, number>,
  key: string,
  mode: TimeMode,
  aggregation: 'average' | 'total',
): number {
  if (key === 'total' && mode === 'extra') {
    return Number(
      row[aggregation === 'average' ? 'avgTotalExtra' : 'sumTotalExtra'] ?? 0,
    )
  }
  if (key === 'dormant' && mode !== 'calendar') return 0
  const prefix = aggregation === 'average' ? 'avg' : 'sum'
  const field = `${prefix}${capitalize(key)}${FIELD_SUFFIX[mode]}`
  return Number(row[field] ?? 0)
}
