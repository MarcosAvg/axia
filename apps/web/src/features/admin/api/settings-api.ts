import { apiFetch } from '@/lib/api-client'
import type { InstanceSettings } from '../domain/settings'
import { settingsToUpdate } from '../domain/settings'

export async function getInstanceSettings(): Promise<InstanceSettings> {
  const body = await apiFetch<{ settings: InstanceSettings }>(
    '/api/admin/settings',
  )
  return body.settings
}

export async function updateInstanceSettings(
  settings: InstanceSettings,
): Promise<void> {
  await apiFetch('/api/admin/settings', {
    method: 'PATCH',
    body: JSON.stringify(settingsToUpdate(settings)),
  })
}
