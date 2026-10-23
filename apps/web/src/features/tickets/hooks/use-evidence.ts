import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/offline/db'
import type { Evidence } from '@/lib/offline/db'
import { getEvidenceUrl } from '../api/evidence-api'
import { saveAndUploadEvidence } from '../api/offline-evidence'
import type { EvidenceType } from '../domain/types'

const evidenceKeys = {
  url: (path: string) => ['evidence', 'url', path] as const,
}

/** Encola la evidencia (comprime y sube reanudable, con soporte sin conexión). */
export function useUploadEvidence() {
  const queryClient = useQueryClient()
  return useMutation({
    networkMode: 'always',
    mutationFn: (variables: {
      ticketId: string
      cycle: number
      type: EvidenceType
      file: File
      note?: string | null
      occurredAt?: string
    }) => saveAndUploadEvidence(variables),
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

/** Evidencias guardadas en el dispositivo para un tiquet (observadas en vivo). */
export function useLocalEvidence(ticketId: string | undefined) {
  return useLiveQuery(
    () =>
      ticketId
        ? db.evidences.where('ticketId').equals(ticketId).toArray()
        : Promise.resolve<Evidence[]>([]),
    [ticketId],
    [],
  )
}

export function useEvidenceUrl(evidenceId: string | null) {
  return useQuery({
    queryKey: evidenceKeys.url(evidenceId ?? ''),
    queryFn: () =>
      evidenceId ? getEvidenceUrl(evidenceId) : Promise.resolve(null),
    enabled: Boolean(evidenceId),
    staleTime: 5 * 60 * 1000,
  })
}
