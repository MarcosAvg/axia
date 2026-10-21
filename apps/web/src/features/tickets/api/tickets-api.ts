// Acceso a datos del feature de tiquets contra la API de Axia.

import { apiFetch, ApiError } from '@/lib/api-client'
import { isFinalStatus } from '../domain/status'
import type {
  DuplicateCandidate,
  SupervisorOption,
  TicketDetail,
  TicketEvidenceItem,
  TicketListItem,
  TicketParticipant,
  TicketPauseState,
  TicketPauseStep,
  TicketStatus,
  TicketTimelineItem,
} from '../domain/types'
import { parseDuplicateCandidates } from '../schemas'
import type { CreateTicketInput } from '../schemas'

const TICKETS_PAGE_SIZE = 20

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

function queryString(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  return search.toString()
}

export async function fetchTickets(
  filters: TicketFilters,
  page: number,
): Promise<TicketPage> {
  const query = queryString({
    status: filters.status,
    statuses: filters.statuses?.join(','),
    buildingId: filters.buildingId,
    categoryId: filters.categoryId,
    search: filters.search,
    page,
    pageSize: TICKETS_PAGE_SIZE,
  })
  return apiFetch<TicketPage>(`/api/tickets?${query}`)
}

export async function fetchTicket(id: string): Promise<TicketDetail | null> {
  try {
    const body = await apiFetch<{ ticket: TicketDetail }>(`/api/tickets/${id}`)
    return body.ticket
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

export async function fetchPauseSteps(
  ticketId: string,
): Promise<TicketPauseStep[]> {
  const body = await apiFetch<{ items: TicketPauseStep[] }>(
    `/api/tickets/${ticketId}/pause-steps`,
  )
  return body.items
}

export async function fetchPauseState(
  ticketId: string,
): Promise<TicketPauseState | null> {
  const body = await apiFetch<{ item: TicketPauseState | null }>(
    `/api/tickets/${ticketId}/pause-state`,
  )
  return body.item
}

type TimelineResponse = {
  id: number
  cycle: number
  type: TicketTimelineItem['type']
  payload: Record<string, unknown> | null
  occurredAt: string
  actorName: string | null
  subjectTechnicianName: string | null
  reasonName: string | null
}

export async function fetchTimeline(
  ticketId: string,
): Promise<TicketTimelineItem[]> {
  const body = await apiFetch<{ items: TimelineResponse[] }>(
    `/api/tickets/${ticketId}/timeline`,
  )
  return body.items.map((item) => ({
    id: item.id,
    cycle: item.cycle,
    type: item.type,
    occurredAt: item.occurredAt,
    actorName: item.actorName,
    subjectTechnicianName: item.subjectTechnicianName,
    reasonName: item.reasonName,
    payload: item.payload ?? {},
  }))
}

export async function fetchParticipants(
  ticketId: string,
): Promise<TicketParticipant[]> {
  const body = await apiFetch<{ items: TicketParticipant[] }>(
    `/api/tickets/${ticketId}/participants`,
  )
  return body.items
}

type EvidenceResponse = {
  id: string
  type: TicketEvidenceItem['type']
  mimeType: string | null
  sizeBytes: number | null
  occurredAt: string
}

export async function fetchEvidence(
  ticketId: string,
): Promise<TicketEvidenceItem[]> {
  const body = await apiFetch<{ items: EvidenceResponse[] }>(
    `/api/tickets/${ticketId}/evidence`,
  )
  return body.items.map((item) => ({
    id: item.id,
    type: item.type,
    storagePath: null,
    mimeType: item.mimeType,
    sizeBytes: item.sizeBytes,
    occurredAt: item.occurredAt,
  }))
}

export async function createTicket(
  input: CreateTicketInput,
  clientRequestId: string,
): Promise<string> {
  const body = await apiFetch<{ ticket: { id: string } }>('/api/tickets', {
    method: 'POST',
    body: JSON.stringify({
      buildingId: input.buildingId,
      locationId: input.locationId,
      dependencyId: input.dependencyId,
      categoryId: input.categoryId,
      subcategoryId: input.subcategoryId || undefined,
      problemId: input.problemId || undefined,
      channelId: input.channelId || undefined,
      description: input.description,
      requesterId: input.requesterId,
      clientRequestId,
    }),
  })
  return body.ticket.id
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
  const body = await apiFetch<{ items: unknown }>('/api/tickets/duplicates', {
    method: 'POST',
    body: JSON.stringify({
      buildingId: input.buildingId,
      categoryId: input.categoryId,
      problemId: input.problemId || undefined,
      description: input.description,
    }),
  })
  return parseDuplicateCandidates(body.items)
}

export async function fetchMyWork(_userId: string): Promise<TicketListItem[]> {
  void _userId
  const body = await apiFetch<{ items: TicketListItem[] }>(
    `/api/tickets/mine?page=${1}&pageSize=100`,
  )
  return body.items.filter((ticket) => !isFinalStatus(ticket.status))
}

export async function fetchMyOffers(
  _userId: string,
): Promise<TicketListItem[]> {
  void _userId
  const body = await apiFetch<{ items: TicketListItem[] }>(
    `/api/tickets/offers?page=1&pageSize=100`,
  )
  return body.items
}

export async function searchTicketsByFolio(
  term: string,
): Promise<TicketListItem[]> {
  const cleaned = term.replace(/[%,()]/g, '').trim()
  if (!cleaned) return []
  const body = await apiFetch<{ items: TicketListItem[] }>(
    `/api/tickets?search=${encodeURIComponent(cleaned)}&page=1&pageSize=10`,
  )
  return body.items
}

export async function fetchSupervisors(): Promise<SupervisorOption[]> {
  const body = await apiFetch<{
    items: Array<{ id: string; fullName: string }>
  }>('/api/supervisors')
  return body.items.map((item) => ({
    id: item.id,
    fullName: item.fullName,
  }))
}
