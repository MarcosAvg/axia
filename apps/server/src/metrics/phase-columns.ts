import { sql, type SQL } from 'drizzle-orm'

/** Medidas que el tablero puede pedir al resumen. */
export const MEASURE_STATS = [
  'average',
  'total',
  'median',
  'p90',
  'p95',
  'max',
] as const

export type MeasureStat = (typeof MEASURE_STATS)[number]

/** Reloj de los tiempos: continuo, laboral o fuera de horario. */
export const METRICS_TIME_MODES = ['calendar', 'laboral', 'extra'] as const

export type MetricsTimeMode = (typeof METRICS_TIME_MODES)[number]

export const PHASE_KEYS = [
  'total',
  'response',
  'assignment',
  'pending_take',
  'reassignment',
  'wait',
  'active',
  'pause',
  'validation',
  'claim',
  'dormant',
  'resolution',
] as const

export type PhaseKey = (typeof PHASE_KEYS)[number]

const PHASE_COLUMNS: Record<
  Exclude<PhaseKey, 'total' | 'resolution' | 'dormant'>,
  string
> = {
  response: 'response_time',
  assignment: 'assignment_time',
  pending_take: 'pending_take_time',
  reassignment: 'reassignment_time',
  wait: 'wait_start_time',
  active: 'active_work_time',
  pause: 'pause_time',
  validation: 'validation_time',
  claim: 'claim_time',
}

/** Universo de desempeño: los duplicados y la hora no verificada quedan fuera. */
export function performancePredicate(): SQL {
  return sql`(v.outcome <> 'duplicate' and not v.has_unverified_time)`
}

/** Predicado propio de la fase; resolución solo cuenta tiquets cerrados. */
export function phasePredicate(key: PhaseKey): SQL {
  return key === 'resolution' ? sql`v.status = 'closed'` : sql`true`
}

const MODE_SUFFIX: Record<MetricsTimeMode, string> = {
  calendar: '',
  laboral: 'labor',
  extra: 'extra',
}

/** Duración de una fase en minutos para el reloj elegido. */
export function phaseMinutes(key: PhaseKey, mode: MetricsTimeMode): SQL {
  if (key === 'dormant') {
    return mode === 'calendar'
      ? sql`extract(epoch from v.dormant_time) / 60`
      : sql`0`
  }
  if (key === 'total' || key === 'resolution') {
    if (mode === 'laboral') {
      return sql`extract(epoch from v.total_time_labor) / 60`
    }
    if (mode === 'extra') {
      return sql`extract(epoch from greatest(interval '0', v.total_time - v.total_time_labor)) / 60`
    }
    return sql`extract(epoch from v.total_time) / 60`
  }
  const column = PHASE_COLUMNS[key]
  const suffix = MODE_SUFFIX[mode]
  const name = suffix ? `${column}_${suffix}` : column
  return sql`extract(epoch from v.${sql.identifier(name)}) / 60`
}

/** Agregado de la medida robusta sobre una expresión ya en minutos. */
export function statAggregate(stat: MeasureStat, minutes: SQL): SQL {
  if (stat === 'median') {
    return sql`percentile_cont(0.5) within group (order by ${minutes})`
  }
  if (stat === 'p90') {
    return sql`percentile_cont(0.9) within group (order by ${minutes})`
  }
  if (stat === 'p95') {
    return sql`percentile_cont(0.95) within group (order by ${minutes})`
  }
  return sql`max(${minutes})`
}

/** `true` cuando la medida se calcula sobre la distribución y no sobre la media. */
export function isRobustStat(stat: MeasureStat): boolean {
  return stat !== 'average' && stat !== 'total'
}
