import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  checkDuplicates,
  createTicket,
  fetchEvidence,
  fetchParticipants,
  fetchTicket,
  fetchTickets,
  fetchTimeline,
} from '../api/tickets-api'
import type { DuplicateCheckInput, TicketFilters } from '../api/tickets-api'
import type { CreateTicketInput } from '../schemas'

const ticketKeys = {
  list: (filters: TicketFilters, page: number) =>
    ['tickets', 'list', filters, page] as const,
  detail: (id: string) => ['tickets', 'detail', id] as const,
  timeline: (id: string) => ['tickets', 'timeline', id] as const,
  participants: (id: string) => ['tickets', 'participants', id] as const,
  evidence: (id: string) => ['tickets', 'evidence', id] as const,
}

export function useTicketsList(filters: TicketFilters, page: number) {
  return useQuery({
    queryKey: ticketKeys.list(filters, page),
    queryFn: () => fetchTickets(filters, page),
    placeholderData: keepPreviousData,
  })
}

export function useTicket(id: string | undefined) {
  return useQuery({
    queryKey: ticketKeys.detail(id ?? ''),
    queryFn: () => (id ? fetchTicket(id) : Promise.resolve(null)),
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
    }) => createTicket(variables.input, variables.clientRequestId),
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
