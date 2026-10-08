import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchImportBatches,
  fetchIntegrationTasks,
  fetchStatusMaps,
  resolveIntegrationTask,
  setStatusMap,
} from '../api/import-api'
import type { StatusMapRow } from '../api/import-api'

const importKeys = {
  statusMaps: ['admin', 'import-status-map'] as const,
  batches: ['admin', 'import-batches'] as const,
  tasks: ['admin', 'integration-tasks'] as const,
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

export function useIntegrationTasks() {
  return useQuery({
    queryKey: importKeys.tasks,
    queryFn: fetchIntegrationTasks,
  })
}

export function useResolveIntegrationTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (taskId: string) => resolveIntegrationTask(taskId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: importKeys.tasks })
    },
  })
}
