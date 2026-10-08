import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getInstanceSettings,
  updateInstanceSettings,
} from '../api/settings-api'
import type { InstanceSettings } from '../domain/settings'

const settingsKeys = {
  settings: ['admin', 'instance-settings'] as const,
}

export function useInstanceSettings() {
  return useQuery({
    queryKey: settingsKeys.settings,
    queryFn: getInstanceSettings,
  })
}

export function useUpdateInstanceSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (settings: InstanceSettings) =>
      updateInstanceSettings(settings),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] })
    },
  })
}
