// Lectura de indicadores. Única capa que habla con Supabase (vistas de métricas).

import { supabase } from '@/lib/supabase'
import { intervalToMinutes } from '../domain/metrics'
import type { MetricsTicket, PauseReasonRow } from '../domain/metrics'

const TICKET_SELECT =
  'id, folio, status, reported_at, building_id, category_id, team_id, dependency_id, ' +
  'total_time, net_time, active_work_time, active_work_time_labor, active_work_time_extra, ' +
  'response_time, assignment_time, validation_time, ' +
  'reassigned_supervisor, recaptured, reopened'

interface TicketRow {
  id: string
  folio: string
  status: string
  reported_at: string
  building_id: string
  category_id: string
  team_id: string
  dependency_id: string
  total_time: string | null
  net_time: string | null
  active_work_time: string | null
  active_work_time_labor: string | null
  active_work_time_extra: string | null
  response_time: string | null
  assignment_time: string | null
  validation_time: string | null
  reassigned_supervisor: boolean
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
    totalMinutes: intervalToMinutes(row.total_time),
    netMinutes: intervalToMinutes(row.net_time),
    activeMinutes: intervalToMinutes(row.active_work_time),
    activeLaborMinutes: intervalToMinutes(row.active_work_time_labor),
    activeExtraMinutes: intervalToMinutes(row.active_work_time_extra),
    responseMinutes: intervalToMinutes(row.response_time),
    assignmentMinutes: intervalToMinutes(row.assignment_time),
    validationMinutes: intervalToMinutes(row.validation_time),
    reassigned: row.reassigned_supervisor,
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
