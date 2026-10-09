// Lectura de indicadores. Única capa que habla con Supabase (vistas de métricas).

import { supabase } from '@/lib/supabase'
import { intervalToMinutes } from '../domain/metrics'
import type {
  DuplicateAlert,
  DuplicateDimensionRow,
  DuplicateTicket,
  MetricsTicket,
  PauseReasonRow,
  SatisfactionSummary,
  SlaPriorityRow,
  SlaSummary,
} from '../domain/metrics'

const TICKET_SELECT =
  'id, folio, status, reported_at, building_id, category_id, team_id, dependency_id, requester_id, ' +
  'total_time, net_time, active_work_time, active_work_time_labor, active_work_time_extra, ' +
  'response_time, assignment_time, validation_time, ' +
  'reassigned_supervisor, reassigned_technician, recaptured, reopened'

interface TicketRow {
  id: string
  folio: string
  status: string
  reported_at: string
  building_id: string
  category_id: string
  team_id: string
  dependency_id: string
  requester_id: string
  total_time: string | null
  net_time: string | null
  active_work_time: string | null
  active_work_time_labor: string | null
  active_work_time_extra: string | null
  response_time: string | null
  assignment_time: string | null
  validation_time: string | null
  reassigned_supervisor: boolean
  reassigned_technician: boolean
  recaptured: boolean
  reopened: boolean
}

function parseTicket(row: TicketRow): MetricsTicket {
  return {
    id: row.id,
    folio: row.folio,
    status: row.status,
    reportedAt: row.reported_at,
    buildingId: row.building_id,
    categoryId: row.category_id,
    teamId: row.team_id,
    dependencyId: row.dependency_id,
    requesterId: row.requester_id,
    totalMinutes: intervalToMinutes(row.total_time),
    netMinutes: intervalToMinutes(row.net_time),
    activeMinutes: intervalToMinutes(row.active_work_time),
    activeLaborMinutes: intervalToMinutes(row.active_work_time_labor),
    activeExtraMinutes: intervalToMinutes(row.active_work_time_extra),
    responseMinutes: intervalToMinutes(row.response_time),
    assignmentMinutes: intervalToMinutes(row.assignment_time),
    validationMinutes: intervalToMinutes(row.validation_time),
    reassigned: row.reassigned_supervisor,
    reassignedTechnician: row.reassigned_technician,
    recaptured: row.recaptured,
    reopened: row.reopened,
  }
}

export async function fetchMetricsTickets(): Promise<MetricsTicket[]> {
  const { data, error } = await supabase
    .from('v_ticket_metrics_base')
    .select(TICKET_SELECT)
    .order('reported_at', { ascending: true })
  if (error) throw error
  return ((data ?? []) as unknown as TicketRow[]).map(parseTicket)
}

interface PauseRow {
  reason_name: string
  pauses: number
  pause_time: string | null
  pause_time_labor: string | null
}

export async function fetchPausesByReason(): Promise<PauseReasonRow[]> {
  const { data, error } = await supabase
    .from('v_metrics_pauses_by_reason')
    .select('reason_name, pauses, pause_time, pause_time_labor')
    .order('pauses', { ascending: false })
  if (error) throw error
  return ((data ?? []) as unknown as PauseRow[]).map((row) => ({
    reasonName: row.reason_name,
    pauses: row.pauses,
    pauseMinutes: intervalToMinutes(row.pause_time),
    pauseLaborMinutes: intervalToMinutes(row.pause_time_labor),
  }))
}

export async function fetchDuplicateTickets(): Promise<DuplicateTicket[]> {
  const { data, error } = await supabase
    .from('v_metrics_duplicate_tickets')
    .select('time_to_mark')
  if (error) throw error
  return ((data ?? []) as unknown as { time_to_mark: string | null }[]).map(
    (row) => ({ timeToMarkMinutes: intervalToMinutes(row.time_to_mark) }),
  )
}

export async function fetchDuplicateAlerts(): Promise<DuplicateAlert[]> {
  const { data, error } = await supabase
    .from('v_metrics_duplicate_alerts')
    .select('decision, candidates, tickets')
  if (error) throw error
  return (data ?? []) as unknown as DuplicateAlert[]
}

export async function fetchDuplicatesByDimension(): Promise<
  DuplicateDimensionRow[]
> {
  const { data, error } = await supabase
    .from('v_metrics_duplicates_by_dimension')
    .select(
      'dimension, dimension_id, dimension_name, tickets, duplicates, duplicate_rate',
    )
    .order('tickets', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as DuplicateDimensionRow[]
}

export async function fetchSatisfaction(): Promise<SatisfactionSummary> {
  const { data, error } = await supabase
    .from('v_metrics_satisfaction')
    .select('average_score, ratings')
    .maybeSingle()
  if (error) throw error
  return {
    average: data?.average_score ?? null,
    ratings: data?.ratings ?? 0,
  }
}

export async function fetchSla(): Promise<SlaSummary> {
  const { data, error } = await supabase
    .from('v_metrics_sla')
    .select(
      'with_target, met, compliance_rate, avg_target_minutes, avg_resolution_minutes',
    )
    .maybeSingle()
  if (error) throw error
  return parseSla(data)
}

interface SlaRow {
  with_target: number | null
  met: number | null
  compliance_rate: number | null
  avg_target_minutes: number | null
  avg_resolution_minutes: number | null
}

const EMPTY_SLA_ROW: SlaRow = {
  with_target: 0,
  met: 0,
  compliance_rate: null,
  avg_target_minutes: null,
  avg_resolution_minutes: null,
}

function parseSla(data: SlaRow | null): SlaSummary {
  const row = data ?? EMPTY_SLA_ROW
  return {
    withTarget: row.with_target ?? 0,
    met: row.met ?? 0,
    complianceRate: row.compliance_rate,
    avgTargetMinutes: row.avg_target_minutes,
    avgResolutionMinutes: row.avg_resolution_minutes,
  }
}

export async function fetchSlaByPriority(): Promise<SlaPriorityRow[]> {
  const { data, error } = await supabase
    .from('v_metrics_sla_by_priority')
    .select('priority_id, priority_name, with_target, met, compliance_rate')
    .order('priority_name')
  if (error) throw error
  return (
    (data ?? []) as unknown as {
      priority_id: string
      priority_name: string
      with_target: number
      met: number
      compliance_rate: number | null
    }[]
  ).map((row) => ({
    priorityId: row.priority_id,
    priorityName: row.priority_name,
    withTarget: row.with_target,
    met: row.met,
    complianceRate: row.compliance_rate,
  }))
}
