// Tipos y funciones puras de los indicadores. Sin React, Supabase ni TanStack.

export interface MetricsTicket {
  id: string
  folio: string
  status: string
  reportedAt: string
  buildingId: string
  categoryId: string
  teamId: string
  dependencyId: string
  totalMinutes: number
  netMinutes: number
  activeMinutes: number
  activeLaborMinutes: number
  activeExtraMinutes: number
  responseMinutes: number
  assignmentMinutes: number
  validationMinutes: number
  reassigned: boolean
  recaptured: boolean
  reopened: boolean
}

export interface MetricsFilters {
  from: string
  to: string
  buildingId: string
  teamId: string
  categoryId: string
  dependencyId: string
}

export const EMPTY_FILTERS: MetricsFilters = {
  from: '',
  to: '',
  buildingId: '',
  teamId: '',
  categoryId: '',
  dependencyId: '',
}

export type Dimension = 'team' | 'building' | 'category' | 'dependency'

const DIMENSION_ID: Record<Dimension, keyof MetricsTicket> = {
  team: 'teamId',
  building: 'buildingId',
  category: 'categoryId',
  dependency: 'dependencyId',
}

/** Minutos a partir de un intervalo de Postgres (`04:05:00`, `1 day 02:00:00`). */
export function intervalToMinutes(value: string | null | undefined): number {
  if (!value) return 0
  const negative = value.trim().startsWith('-')
  const text = value.replace(/^-/, '')
  let minutes = 0
  const days = text.match(/(\d+)\s+day/)
  if (days) minutes += Number(days[1]) * 1440
  const time = text.match(/(\d+):(\d{2})/)
  if (time) minutes += Number(time[1]) * 60 + Number(time[2])
  return negative ? -minutes : minutes
}

/** Duración legible a partir de minutos. */
export function formatMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0 min'
  const rounded = Math.round(minutes)
  const hours = Math.floor(rounded / 60)
  const rest = rounded % 60
  if (hours === 0) return `${rest} min`
  if (rest === 0) return `${hours} h`
  return `${hours} h ${rest} min`
}

function ratio(part: number, total: number): number {
  return total > 0 ? part / total : 0
}

/** Porcentaje legible a partir de una razón 0..1. */
export function formatPercent(rate: number): string {
  if (!Number.isFinite(rate)) return '0%'
  return `${Math.round(rate * 100)}%`
}

function withinRange(iso: string, from: string, to: string): boolean {
  const day = iso.slice(0, 10)
  if (from && day < from) return false
  if (to && day > to) return false
  return true
}

/** Filtra los tiquets por rango de fechas (día) y dimensiones. */
export function filterTickets(
  tickets: MetricsTicket[],
  filters: MetricsFilters,
): MetricsTicket[] {
  return tickets.filter((ticket) => {
    if (!withinRange(ticket.reportedAt, filters.from, filters.to)) return false
    if (filters.buildingId && ticket.buildingId !== filters.buildingId)
      return false
    if (filters.teamId && ticket.teamId !== filters.teamId) return false
    if (filters.categoryId && ticket.categoryId !== filters.categoryId) {
      return false
    }
    if (filters.dependencyId && ticket.dependencyId !== filters.dependencyId) {
      return false
    }
    return true
  })
}

export interface MetricsSummary {
  tickets: number
  reassigned: number
  recaptured: number
  reopened: number
  reassignmentRate: number
  recaptureRate: number
  reopenRate: number
  firstTimeFixRate: number
  avgTotal: number
  avgNet: number
  avgActive: number
  avgActiveLabor: number
  avgActiveExtra: number
  avgResponse: number
  avgAssignment: number
  avgValidation: number
}

function average(
  tickets: MetricsTicket[],
  pick: (ticket: MetricsTicket) => number,
): number {
  if (tickets.length === 0) return 0
  const total = tickets.reduce((sum, ticket) => sum + pick(ticket), 0)
  return total / tickets.length
}

/** Resume los KPI del conjunto de tiquets. */
export function summarize(tickets: MetricsTicket[]): MetricsSummary {
  const count = tickets.length
  const reassigned = tickets.filter((t) => t.reassigned).length
  const recaptured = tickets.filter((t) => t.recaptured).length
  const reopened = tickets.filter((t) => t.reopened).length
  const closed = tickets.filter((t) => t.status === 'closed')
  const firstFix = closed.filter((t) => !t.reopened).length
  return {
    tickets: count,
    reassigned,
    recaptured,
    reopened,
    reassignmentRate: ratio(reassigned, count),
    recaptureRate: ratio(recaptured, count),
    reopenRate: ratio(reopened, count),
    firstTimeFixRate: ratio(firstFix, closed.length),
    avgTotal: average(tickets, (t) => t.totalMinutes),
    avgNet: average(tickets, (t) => t.netMinutes),
    avgActive: average(tickets, (t) => t.activeMinutes),
    avgActiveLabor: average(tickets, (t) => t.activeLaborMinutes),
    avgActiveExtra: average(tickets, (t) => t.activeExtraMinutes),
    avgResponse: average(tickets, (t) => t.responseMinutes),
    avgAssignment: average(tickets, (t) => t.assignmentMinutes),
    avgValidation: average(tickets, (t) => t.validationMinutes),
  }
}

export interface VolumePoint {
  date: string
  tickets: number
}

/** Cuenta tiquets por día de registro (solo los días con actividad). */
export function volumeByDate(tickets: MetricsTicket[]): VolumePoint[] {
  const counts = new Map<string, number>()
  for (const ticket of tickets) {
    const date = ticket.reportedAt.slice(0, 10)
    counts.set(date, (counts.get(date) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, tickets: count }))
}

export interface DimensionRow {
  id: string
  tickets: number
  avgActive: number
  avgTotal: number
  avgActiveExtra: number
  reassignmentRate: number
  recaptureRate: number
}

/** Agrega los tiquets por una dimensión (equipo, edificio, categoría, dependencia). */
export function byDimension(
  tickets: MetricsTicket[],
  dimension: Dimension,
): DimensionRow[] {
  const key = DIMENSION_ID[dimension]
  const groups = new Map<string, MetricsTicket[]>()
  for (const ticket of tickets) {
    const id = String(ticket[key])
    const list = groups.get(id)
    if (list) list.push(ticket)
    else groups.set(id, [ticket])
  }
  return [...groups.entries()]
    .map(([id, list]) => {
      const summary = summarize(list)
      return {
        id,
        tickets: list.length,
        avgActive: summary.avgActive,
        avgTotal: summary.avgTotal,
        avgActiveExtra: summary.avgActiveExtra,
        reassignmentRate: summary.reassignmentRate,
        recaptureRate: summary.recaptureRate,
      }
    })
    .sort((a, b) => b.tickets - a.tickets)
}

/** Arma un CSV simple a partir de encabezados y filas (valores ya formateados). */
export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const escape = (cell: string | number): string => {
    const text = String(cell)
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  return [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n')
}

export interface PauseReasonRow {
  reasonName: string
  pauses: number
  pauseMinutes: number
  pauseLaborMinutes: number
}

export interface DuplicateTicket {
  timeToMarkMinutes: number
}

export interface DuplicateAlert {
  decision: string
  candidates: number
  tickets: number
}

export interface DuplicateDimensionRow {
  dimension: string
  dimensionId: string
  dimensionName: string | null
  tickets: number
  duplicates: number
  duplicateRate: number
}

/** Promedio de minutos de una lista de números. */
export function averageOf(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

const OPEN_STATUSES = new Set([
  'registered',
  'with_supervisor',
  'assigned',
  'in_progress',
  'paused',
  'attended',
  'under_claim',
])

export interface AgingRow {
  id: string
  folio: string
  status: string
  ageMinutes: number
}

/** Antigüedad de los tiquets pendientes, de mayor a menor. */
export function openAging(tickets: MetricsTicket[], now: Date): AgingRow[] {
  return tickets
    .filter((ticket) => OPEN_STATUSES.has(ticket.status))
    .map((ticket) => ({
      id: ticket.id,
      folio: ticket.folio,
      status: ticket.status,
      ageMinutes: Math.max(
        0,
        (now.getTime() - new Date(ticket.reportedAt).getTime()) / 60000,
      ),
    }))
    .sort((a, b) => b.ageMinutes - a.ageMinutes)
}
