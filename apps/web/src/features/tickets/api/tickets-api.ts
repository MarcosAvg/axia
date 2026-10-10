// Acceso a datos del feature de tiquets (solo lectura + alta). Las transiciones
// llegan en el tramo de bandejas. Única capa que habla con Supabase.

import { supabase } from '@/lib/supabase'
import { isFinalStatus } from '../domain/status'
import type {
  DuplicateCandidate,
  SupervisorOption,
  TicketDetail,
  TicketEvidenceItem,
  TicketListItem,
  TicketParticipant,
  TicketPauseStep,
  TicketStatus,
  TicketTimelineItem,
} from '../domain/types'
import {
  parseDuplicateCandidates,
  parseEvidence,
  parseParticipant,
  parseTicketDetail,
  parseTicketListItem,
  parseTimelineItem,
} from '../schemas'
import type { CreateTicketInput } from '../schemas'

const TICKETS_PAGE_SIZE = 20

const LIST_SELECT =
  'id, folio, status, reported_at, closed_at, description, requester_name, possible_duplicate, building:buildings(name), category:categories(name), priority:priorities(name), team:teams(name)'

const DETAIL_SELECT = `${LIST_SELECT}, cycle, building_id, location_id, dependency_id, category_id, subcategory_id, problem_id, service_type_id, priority_id, requester_contact, duplicate_of_id, location:locations(name), dependency:dependencies(name), subcategory:subcategories(name), problem:problems(name), service_type:service_types(name), channel:channels(name)`

export interface TicketFilters {
  status?: TicketStatus
  statuses?: TicketStatus[]
  buildingId?: string
  categoryId?: string
  search?: string
}

export interface TicketPage {
  items: TicketListItem[]
  total: number
  page: number
  pageSize: number
}

function buildTicketsQuery(filters: TicketFilters) {
  const match = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.buildingId ? { building_id: filters.buildingId } : {}),
    ...(filters.categoryId ? { category_id: filters.categoryId } : {}),
  }
  const term = filters.search?.replace(/[%,()]/g, '')

  let query = supabase
    .from('tickets')
    .select(LIST_SELECT, { count: 'exact' })
    .match(match)
  if (filters.statuses?.length) query = query.in('status', filters.statuses)
  if (term) {
    query = query.or(`folio.ilike.%${term}%,description.ilike.%${term}%`)
  }
  return query
}

export async function fetchTickets(
  filters: TicketFilters,
  page: number,
): Promise<TicketPage> {
  const from = (page - 1) * TICKETS_PAGE_SIZE
  const { data, error, count } = await buildTicketsQuery(filters)
    .order('reported_at', { ascending: false })
    .range(from, from + TICKETS_PAGE_SIZE - 1)
  if (error) throw error
  return {
    items: (data ?? []).map(parseTicketListItem),
    total: count ?? 0,
    page,
    pageSize: TICKETS_PAGE_SIZE,
  }
}

export async function fetchTicket(id: string): Promise<TicketDetail | null> {
  const { data, error } = await supabase
    .from('tickets')
    .select(DETAIL_SELECT)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data ? parseTicketDetail(data) : null
}

interface PauseStepRow {
  pause_id: string
  reason_id: string
  reason_name: string
  entered_at: string
  exited_at: string | null
  note: string | null
  actor_name: string | null
}

/** Pasos (subestados) de las pausas de un tiquet, con sus fechas. */
export async function fetchPauseSteps(
  ticketId: string,
): Promise<TicketPauseStep[]> {
  const { data, error } = await supabase.rpc('ticket_pause_steps', {
    p_ticket_id: ticketId,
  })
  if (error) throw error
  return ((data ?? []) as PauseStepRow[]).map((row) => ({
    pauseId: row.pause_id,
    reasonId: row.reason_id,
    reasonName: row.reason_name,
    enteredAt: row.entered_at,
    exitedAt: row.exited_at,
    note: row.note,
    actorName: row.actor_name,
  }))
}

export async function fetchTimeline(
  ticketId: string,
): Promise<TicketTimelineItem[]> {
  const { data, error } = await supabase
    .from('v_ticket_timeline')
    .select(
      'id, cycle, type, payload, occurred_at, actor_name, subject_technician_name, reason_name',
    )
    .eq('ticket_id', ticketId)
    .order('occurred_at', { ascending: true })
    .order('id', { ascending: true })
  if (error) throw error
  return (data ?? []).map(parseTimelineItem)
}

export async function fetchParticipants(
  ticketId: string,
): Promise<TicketParticipant[]> {
  const { data, error } = await supabase
    .from('ticket_participants')
    .select(
      'technician:technicians(id, full_name), participation_type, started_at, ended_at',
    )
    .eq('ticket_id', ticketId)
    .order('started_at')
  if (error) throw error
  return (data ?? []).map(parseParticipant)
}

export async function fetchEvidence(
  ticketId: string,
): Promise<TicketEvidenceItem[]> {
  const { data, error } = await supabase
    .from('evidence')
    .select('id, type, storage_path, mime_type, size_bytes, occurred_at')
    .eq('ticket_id', ticketId)
    .order('occurred_at')
  if (error) throw error
  return (data ?? []).map(parseEvidence)
}

export async function createTicket(
  input: CreateTicketInput,
  clientRequestId: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('ticket_create', {
    p_data: {
      building_id: input.buildingId,
      location_id: input.locationId,
      dependency_id: input.dependencyId,
      category_id: input.categoryId,
      subcategory_id: input.subcategoryId || null,
      problem_id: input.problemId || null,
      channel_id: input.channelId || null,
      description: input.description,
      requester_id: input.requesterId,
    },
    p_client_request_id: clientRequestId,
  })
  if (error) throw error
  return data
}

export interface DuplicateCheckInput {
  buildingId: string
  categoryId: string
  problemId?: string
  description: string
}

export async function checkDuplicates(
  input: DuplicateCheckInput,
): Promise<DuplicateCandidate[]> {
  const { data, error } = await supabase.rpc('ticket_check_duplicates', {
    p_data: {
      building_id: input.buildingId,
      category_id: input.categoryId,
      problem_id: input.problemId || null,
      description: input.description,
    },
  })
  if (error) throw error
  return parseDuplicateCandidates(data)
}

async function fetchTicketsByIds(ids: string[]): Promise<TicketListItem[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabase
    .from('tickets')
    .select(LIST_SELECT)
    .in('id', ids)
  if (error) throw error
  return (data ?? []).map(parseTicketListItem)
}

/** Tiquets asignados al técnico vinculado a esta cuenta (bandeja del técnico). */
export async function fetchMyWork(userId: string): Promise<TicketListItem[]> {
  const technician = await supabase
    .from('technicians')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
  if (technician.error) throw technician.error
  if (!technician.data) return []

  const assignments = await supabase
    .from('ticket_assignments')
    .select('ticket_id')
    .eq('assignee_technician_id', technician.data.id)
    .is('ended_at', null)
  if (assignments.error) throw assignments.error
  const ids = (assignments.data ?? []).map((row) => row.ticket_id)
  const tickets = await fetchTicketsByIds(ids)
  return tickets.filter((ticket) => !isFinalStatus(ticket.status))
}

/** Tiquets ofrecidos a esta cuenta como supervisor (bandeja de ofertas). */
export async function fetchMyOffers(userId: string): Promise<TicketListItem[]> {
  const offers = await supabase
    .from('ticket_offers')
    .select('ticket_id')
    .eq('supervisor_user_id', userId)
    .eq('status', 'offered')
  if (offers.error) throw offers.error
  const ids = (offers.data ?? []).map((row) => row.ticket_id)
  return fetchTicketsByIds(ids)
}

/** Tiquets cuyo folio coincide con el término (para marcar duplicados). */
export async function searchTicketsByFolio(
  term: string,
): Promise<TicketListItem[]> {
  const cleaned = term.replace(/[%,()]/g, '').trim()
  if (!cleaned) return []
  const { data, error } = await supabase
    .from('tickets')
    .select(LIST_SELECT)
    .ilike('folio', `%${cleaned}%`)
    .limit(10)
  if (error) throw error
  return (data ?? []).map(parseTicketListItem)
}

/** Supervisores con ámbito activo (para reasignar un supervisor concreto). */
export async function fetchSupervisors(): Promise<SupervisorOption[]> {
  const scopes = await supabase
    .from('supervisor_scopes')
    .select('user_id')
    .eq('active', true)
  if (scopes.error) throw scopes.error
  const ids = [...new Set((scopes.data ?? []).map((row) => row.user_id))]
  if (ids.length === 0) return []
  const profiles = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', ids)
    .order('full_name')
  if (profiles.error) throw profiles.error
  return (profiles.data ?? []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
  }))
}
