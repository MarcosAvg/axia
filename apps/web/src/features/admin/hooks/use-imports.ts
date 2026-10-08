import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchImportBatches,
  fetchStatusMaps,
  setStatusMap,
} from '../api/import-api'
import type { StatusMapRow } from '../api/import-api'

const importKeys = {
  statusMaps: ['admin', 'import-status-map'] as const,
  batches: ['admin', 'import-batches'] as const,
}

export function useStatusMaps() {
  return useQuery({ queryKey: importKeys.statusMaps, queryFn: fetchStatusMaps })
}

export function useSetStatusMap() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      system: string
      externalStatus: string
      ticketStatus: StatusMapRow['ticketStatus']
    }) => setStatusMap(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: importKeys.statusMaps })
    },
  })
}

export function useImportBatches() {
  return useQuery({ queryKey: importKeys.batches, queryFn: fetchImportBatches })
}
