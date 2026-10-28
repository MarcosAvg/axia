export function number(value: unknown): number {
  return Number(value ?? 0)
}

export function intervalMinutes(value: unknown): number {
  if (typeof value !== 'string') return 0
  const days = value.match(/(\d+)\s+day/)
  const time = value.match(/(\d+):(\d{2})/)
  return (
    (days ? Number(days[1]) * 1440 : 0) +
    (time ? Number(time[1]) * 60 + Number(time[2]) : 0)
  )
}

export function minutesToInterval(minutes: number): string {
  const total = Math.max(0, Math.round(minutes))
  const hours = Math.floor(total / 60)
  const rest = total % 60
  return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}:00`
}

type MetricsRow = Record<string, unknown>

export function mergeBy(
  rows: MetricsRow[],
  keyOf: (row: MetricsRow) => string,
  sumFields: string[],
  intervalFields: string[] = [],
): MetricsRow[] {
  const map = new Map<string, MetricsRow>()
  for (const row of rows) {
    const key = keyOf(row)
    const current = map.get(key)
    if (!current) {
      // La primera fila también se normaliza: pg devuelve los COUNT como texto.
      const normalized = { ...row }
      for (const field of sumFields) normalized[field] = number(row[field])
      for (const field of intervalFields) {
        normalized[field] = minutesToInterval(intervalMinutes(row[field]))
      }
      map.set(key, normalized)
      continue
    }
    for (const field of sumFields) {
      current[field] = number(current[field]) + number(row[field])
    }
    for (const field of intervalFields) {
      current[field] = minutesToInterval(
        intervalMinutes(current[field]) + intervalMinutes(row[field]),
      )
    }
  }
  return [...map.values()]
}
