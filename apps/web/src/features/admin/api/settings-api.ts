import { supabase } from '@/lib/supabase'
import {
  intervalToDays,
  isEvidencePolicy,
  isValidationPolicy,
  settingsToUpdate,
} from '../domain/settings'
import type { InstanceSettings } from '../domain/settings'

export async function getInstanceSettings(): Promise<InstanceSettings> {
  const { data, error } = await supabase
    .from('instance_settings')
    .select(
      'team_label, validation_policy, auto_validation_days, claim_window, request_evidence_policy, folio_pattern, timezone',
    )
    .limit(1)
    .single()
  if (error) throw error
  return {
    teamLabel: data.team_label,
    validationPolicy: isValidationPolicy(data.validation_policy)
      ? data.validation_policy
      : 'both',
    autoValidationDays: data.auto_validation_days,
    claimWindowDays: intervalToDays(data.claim_window),
    requestEvidencePolicy: isEvidencePolicy(data.request_evidence_policy)
      ? data.request_evidence_policy
      : 'recommended',
    folioPattern: data.folio_pattern,
    timezone: data.timezone,
  }
}

export async function updateInstanceSettings(
  settings: InstanceSettings,
): Promise<void> {
  const { error } = await supabase
    .from('instance_settings')
    .update(settingsToUpdate(settings))
    .eq('singleton', true)
  if (error) throw error
}
