import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getEvidenceUrl, uploadEvidence } from '../api/evidence-api'
import type { EvidenceType } from '../domain/types'

const evidenceKeys = {
  url: (path: string) => ['evidence', 'url', path] as const,
}

export function useUploadEvidence() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (variables: {
      ticketId: string
      cycle: number
      type: EvidenceType
      file: File
      clientRequestId: string
    }) => uploadEvidence(variables),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['tickets', 'evidence', variables.ticketId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['tickets', 'timeline', variables.ticketId],
      })
    },
  })
}

export function useEvidenceUrl(storagePath: string | null) {
  return useQuery({
    queryKey: evidenceKeys.url(storagePath ?? ''),
    queryFn: () =>
      storagePath ? getEvidenceUrl(storagePath) : Promise.resolve(null),
    enabled: Boolean(storagePath),
    staleTime: 5 * 60 * 1000,
  })
}
