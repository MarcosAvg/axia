// Lectura de indicadores. Única capa que habla con Supabase.

import { supabase } from '@/lib/supabase'
import type {
  RejectCancelRow,
  RoutingSummary,
  TechnicianRow,
} from '../domain/indicators'
import { intervalToMinutes } from '../domain/metrics'
import type {
  DuplicateAlert,
  DuplicateDimensionRow,
  DuplicateTicket,
  MetricsFilters,
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

/** Parámetros de filtro para las funciones de indicadores (vacío = sin filtro). */
function filterParams(filters: MetricsFilters) {
  return {
    p_from: filters.from || undefined,
    p_to: filters.to || undefined,
    p_building: filters.buildingId || undefined,
    p_team: filters.teamId || undefined,
    p_category: filters.categoryId || undefined,
    p_dependency: filters.dependencyId || undefined,
  }
}

export async function fetchPausesByReason(
  filters: MetricsFilters,
): Promise<PauseReasonRow[]> {
  const { data, error } = await supabase.rpc(
    'metrics_pauses_by_reason',
    filterParams(filters),
  )
  if (error) throw error
  return (data ?? []).map((row) => ({
    reasonName: row.reason_name,
    pauses: row.pauses,
    pauseMinutes: intervalToMinutes(row.pause_time),
    pauseLaborMinutes: intervalToMinutes(row.pause_time_labor),
  }))
}

export async function fetchDuplicateTickets(
  filters: MetricsFilters,
): Promise<DuplicateTicket[]> {
  const { data, error } = await supabase.rpc(
    'metrics_duplicate_tickets',
    filterParams(filters),
  )
  if (error) throw error
  return (data ?? []).map((row) => ({
    timeToMarkMinutes: intervalToMinutes(row.time_to_mark),
  }))
}

export async function fetchDuplicateAlerts(
  filters: MetricsFilters,
): Promise<DuplicateAlert[]> {
  const { data, error } = await supabase.rpc(
    'metrics_duplicate_alerts',
    filterParams(filters),
  )
  if (error) throw error
  return (data ?? []).map((row) => ({
    decision: row.decision,
    candidates: row.candidates,
    tickets: row.tickets,
  }))
}

export async function fetchDuplicatesByDimension(
  filters: MetricsFilters,
): Promise<DuplicateDimensionRow[]> {
  const { data, error } = await supabase.rpc(
    'metrics_duplicates_by_dimension',
    filterParams(filters),
  )
  if (error) throw error
  return (data ?? []).map((row) => ({
    dimension: row.dimension,
    dimensionId: row.dimension_id,
    dimensionName: row.dimension_name,
    tickets: row.tickets,
    duplicates: row.duplicates,
    duplicateRate: row.duplicate_rate,
  }))
}

export async function fetchSatisfaction(
  filters: MetricsFilters,
): Promise<SatisfactionSummary> {
  const { data, error } = await supabase.rpc(
    'metrics_satisfaction',
    filterParams(filters),
  )
  if (error) throw error
  const row = data?.[0]
  return { average: row?.average_score ?? null, ratings: row?.ratings ?? 0 }
}

export async function fetchSla(filters: MetricsFilters): Promise<SlaSummary> {
  const { data, error } = await supabase.rpc(
    'metrics_sla',
    filterParams(filters),
  )
  if (error) throw error
  return parseSla(data?.[0] ?? null)
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

export async function fetchSlaByPriority(
  filters: MetricsFilters,
): Promise<SlaPriorityRow[]> {
  const { data, error } = await supabase.rpc(
    'metrics_sla_by_priority',
    filterParams(filters),
  )
  if (error) throw error
  return (data ?? []).map((row) => ({
    priorityId: row.priority_id,
    priorityName: row.priority_name,
    withTarget: row.with_target,
    met: row.met,
    complianceRate: row.compliance_rate,
  }))
}

export async function fetchByTechnician(
  filters: MetricsFilters,
): Promise<TechnicianRow[]> {
  const { data, error } = await supabase.rpc(
    'metrics_by_technician',
    filterParams(filters),
  )
  if (error) throw error
  return (data ?? []).map((row) => ({
    technicianId: row.technician_id,
    name: row.technician_name,
    tickets: row.tickets,
    leaderCount: row.leader_count,
    auxiliaryCount: row.auxiliary_count,
    participationMinutes: intervalToMinutes(row.participation_time),
    participationLaborMinutes: intervalToMinutes(row.participation_time_labor),
    participationExtraMinutes: intervalToMinutes(row.participation_time_extra),
    assignedCount: row.assigned_count,
  }))
}

export async function fetchRejectCancel(
  filters: MetricsFilters,
): Promise<RejectCancelRow[]> {
  const { data, error } = await supabase.rpc(
    'metrics_reject_cancel_by_reason',
    filterParams(filters),
  )
  if (error) throw error
  return (data ?? []).map((row) => ({
    eventType: row.event_type,
    reasonName: row.reason_name,
    tickets: row.tickets,
  }))
}

export async function fetchRouting(
  filters: MetricsFilters,
): Promise<RoutingSummary> {
  const { data, error } = await supabase.rpc(
    'metrics_routing',
    filterParams(filters),
  )
  if (error) throw error
  const row = data?.[0]
  return {
    offers: row?.offers ?? 0,
    pendingOffers: row?.pending_offers ?? 0,
    taken: row?.taken ?? 0,
    avgTimeToTakeMinutes: intervalToMinutes(row?.avg_time_to_take),
  }
}
