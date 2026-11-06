import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useMemo } from 'react'
import {
  adjustEventTime,
  checkDuplicates,
  createTicket,
  dismissDuplicateAlerts,
  fetchAttentionCounts,
  fetchDuplicateAlerts,
  fetchEvidence,
  fetchMyOffers,
  fetchMyWork,
  fetchParticipants,
  fetchPauseState,
  fetchPauseSteps,
  fetchTicket,
  fetchTickets,
  fetchTimeline,
  TICKETS_PAGE_SIZE,
  fetchSupervisors,
  searchTicketsByFolio,
} from '../api/tickets-api'
import type { DuplicateCheckInput, TicketFilters } from '../api/tickets-api'
import { projectPendingList } from '../domain/pending-actions'
import { usePendingActions } from './use-pending-actions'
import type { CreateTicketInput } from '../schemas'

const ticketKeys = {
  list: (filters: TicketFilters, page: number, pageSize: number) =>
    ['tickets', 'list', filters, page, pageSize] as const,
  myWork: (userId: string) => ['tickets', 'my-work', userId] as const,
  myOffers: (userId: string) => ['tickets', 'my-offers', userId] as const,
  attention: ['tickets', 'attention'] as const,
  detail: (id: string) => ['tickets', 'detail', id] as const,
  timeline: (id: string) => ['tickets', 'timeline', id] as const,
  participants: (id: string) => ['tickets', 'participants', id] as const,
  evidence: (id: string) => ['tickets', 'evidence', id] as const,
  pauseSteps: (id: string) => ['tickets', 'pause-steps', id] as const,
  pauseState: (id: string) => ['tickets', 'pause-state', id] as const,
  duplicateAlerts: (id: string) => ['tickets', 'duplicate-alerts', id] as const,
}

export function useTicketsList(
  filters: TicketFilters,
  page: number,
  pageSize = TICKETS_PAGE_SIZE,
) {
  const query = useQuery({
    queryKey: ticketKeys.list(filters, page, pageSize),
    queryFn: () => fetchTickets(filters, page, pageSize),
    placeholderData: keepPreviousData,
  })
  const pending = usePendingActions()
  const data = useMemo(() => {
    if (!query.data) return query.data
    return {
      ...query.data,
      items: projectPendingList(query.data.items, pending),
    }
  }, [pending, query.data])
  return { ...query, data }
}

export function useTicket(id: string | undefined) {
  return useQuery({
    queryKey: ticketKeys.detail(id ?? ''),
    queryFn: () => (id ? fetchTicket(id) : Promise.resolve(null)),
    enabled: Boolean(id),
  })
}

export function useTicketPauseSteps(id: string | undefined) {
  return useQuery({
    queryKey: ticketKeys.pauseSteps(id ?? ''),
    queryFn: () => (id ? fetchPauseSteps(id) : Promise.resolve([])),
    enabled: Boolean(id),
  })
}

export function useTicketPauseState(id: string | undefined) {
  return useQuery({
    queryKey: ticketKeys.pauseState(id ?? ''),
    queryFn: () => (id ? fetchPauseState(id) : Promise.resolve(null)),
    enabled: Boolean(id),
  })
}

export function useTicketTimeline(id: string | undefined) {
  return useQuery({
    queryKey: ticketKeys.timeline(id ?? ''),
    queryFn: () => (id ? fetchTimeline(id) : Promise.resolve([])),
    enabled: Boolean(id),
  })
}

export function useTicketParticipants(id: string | undefined) {
  return useQuery({
    queryKey: ticketKeys.participants(id ?? ''),
    queryFn: () => (id ? fetchParticipants(id) : Promise.resolve([])),
    enabled: Boolean(id),
  })
}

export function useTicketEvidence(id: string | undefined) {
  return useQuery({
    queryKey: ticketKeys.evidence(id ?? ''),
    queryFn: () => (id ? fetchEvidence(id) : Promise.resolve([])),
    enabled: Boolean(id),
  })
}

export function useCreateTicket() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (variables: {
      input: CreateTicketInput
      clientRequestId: string
      shownCandidateIds?: string[]
      attachmentId?: string
    }) =>
      createTicket(
        variables.input,
        variables.clientRequestId,
        variables.shownCandidateIds,
        variables.attachmentId,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}

export function useCheckDuplicates() {
  return useMutation({
    mutationFn: (input: DuplicateCheckInput) => checkDuplicates(input),
  })
}

export function useDuplicateAlerts(ticketId: string, enabled = true) {
  return useQuery({
    queryKey: ticketKeys.duplicateAlerts(ticketId),
    queryFn: () => fetchDuplicateAlerts(ticketId),
    enabled,
  })
}

export function useDismissDuplicateAlerts(ticketId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => dismissDuplicateAlerts(ticketId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}

export function useMyWork(userId: string | undefined, enabled = true) {
  const query = useQuery({
    queryKey: ticketKeys.myWork(userId ?? ''),
    queryFn: () => (userId ? fetchMyWork(userId) : Promise.resolve([])),
    enabled: Boolean(userId) && enabled,
  })
  const pending = usePendingActions()
  const data = useMemo(
    () => (query.data ? projectPendingList(query.data, pending) : query.data),
    [pending, query.data],
  )
  return { ...query, data }
}

export function useMyOffers(userId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ticketKeys.myOffers(userId ?? ''),
    queryFn: () => (userId ? fetchMyOffers(userId) : Promise.resolve([])),
    enabled: Boolean(userId) && enabled,
  })
}

export function useAttentionCounts(enabled = true) {
  return useQuery({
    queryKey: ticketKeys.attention,
    queryFn: fetchAttentionCounts,
    enabled,
    staleTime: 30 * 1000,
  })
}

export function useTicketSearchByFolio(term: string) {
  return useQuery({
    queryKey: ['tickets', 'search', term],
    queryFn: () => searchTicketsByFolio(term),
    enabled: term.trim().length >= 2,
  })
}

export function useSupervisors() {
  return useQuery({
    queryKey: ['tickets', 'supervisors'],
    queryFn: fetchSupervisors,
    staleTime: 5 * 60 * 1000,
  })
}

/** Ajusta la hora de un evento del tiquet. */
export function useAdjustEventTime(ticketId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (variables: { eventId: number; occurredAt: string }) =>
      adjustEventTime(ticketId, variables.eventId, variables.occurredAt),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}
