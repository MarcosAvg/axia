// Acceso a datos del feature de tiquets (solo lectura + alta). Las transiciones
// llegan en el tramo de bandejas. Única capa que habla con Supabase.

import { supabase } from '@/lib/supabase'
import type {
  DuplicateCandidate,
  TicketDetail,
  TicketEvidenceItem,
  TicketListItem,
  TicketParticipant,
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

const DETAIL_SELECT = `${LIST_SELECT}, cycle, building_id, category_id, priority_id, requester_contact, duplicate_of_id, location:locations(name), dependency:dependencies(name), subcategory:subcategories(name), problem:problems(name), service_type:service_types(name), channel:channels(name)`

export interface TicketFilters {
  status?: TicketStatus
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

export async function fetchTickets(
  filters: TicketFilters,
  page: number,
): Promise<TicketPage> {
  const from = (page - 1) * TICKETS_PAGE_SIZE
  let query = supabase.from('tickets').select(LIST_SELECT, { count: 'exact' })

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.buildingId) query = query.eq('building_id', filters.buildingId)
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId)
  if (filters.search) {
    const term = filters.search.replace(/[%,()]/g, '')
    if (term) {
      query = query.or(`folio.ilike.%${term}%,description.ilike.%${term}%`)
    }
  }

  const { data, error, count } = await query
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
      'technician:technicians(full_name), participation_type, started_at, ended_at',
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
      service_type_id: input.serviceTypeId,
      priority_id: input.priorityId,
      channel_id: input.channelId,
      description: input.description,
      requester_id: input.requesterId,
      requester_name: input.requesterName || null,
      requester_contact: input.requesterContact || null,
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
