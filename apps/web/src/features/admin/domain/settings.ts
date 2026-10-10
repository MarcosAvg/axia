import { EVENT_TYPES } from '@/features/tickets'
import type { EventType } from '@/features/tickets'

export type ValidationPolicy = 'requester' | 'supervisor' | 'both'
export type EvidencePolicy = 'optional' | 'recommended' | 'required'
export type SlaClockMode = 'calendar' | 'laboral'

const EVENT_TYPE_SET = new Set<string>(EVENT_TYPES)

/** Verdadero si el valor es un tipo de evento conocido. */
export function isEventType(value: string): value is EventType {
  return EVENT_TYPE_SET.has(value)
}

const SLAL_CLOCK_MODES: SlaClockMode[] = ['calendar', 'laboral']

export function isSlaClockMode(value: string): value is SlaClockMode {
  return (SLAL_CLOCK_MODES as readonly string[]).includes(value)
}

const VALIDATION_POLICIES: ValidationPolicy[] = [
  'requester',
  'supervisor',
  'both',
]
const EVIDENCE_POLICIES: EvidencePolicy[] = [
  'optional',
  'recommended',
  'required',
]

export function isValidationPolicy(value: string): value is ValidationPolicy {
  return (VALIDATION_POLICIES as readonly string[]).includes(value)
}

export function isEvidencePolicy(value: string): value is EvidencePolicy {
  return (EVIDENCE_POLICIES as readonly string[]).includes(value)
}

export interface InstanceSettings {
  teamLabel: string
  validationPolicy: ValidationPolicy
  autoValidationDays: number | null
  claimWindowDays: number
  requestEvidencePolicy: EvidencePolicy
  folioPattern: string
  timezone: string
  defaultCalendarId: string | null
  slaClockMode: SlaClockMode
  requesterVisibleEventTypes: EventType[]
}

/** Días a partir de un intervalo de Postgres (p. ej. `1 day`). */
export function intervalToDays(value: string | null | undefined): number {
  if (!value) return 0
  const match = value.match(/\d+/)
  return match ? Number(match[0]) : 0
}

export interface SettingsFormValues {
  teamLabel: string
  validationPolicy: ValidationPolicy
  autoValidationDays?: string
  claimWindowDays: string
  requestEvidencePolicy: EvidencePolicy
  folioPattern: string
  timezone: string
  defaultCalendarId?: string
  slaClockMode: SlaClockMode
  requesterVisibleEventTypes: EventType[]
}

export interface SettingsUpdate {
  team_label: string
  validation_policy: ValidationPolicy
  auto_validation_days: number | null
  claim_window: string
  request_evidence_policy: EvidencePolicy
  folio_pattern: string
  timezone: string
  default_calendar_id: string | null
  sla_clock_mode: SlaClockMode
  requester_visible_event_types: EventType[]
}

export function settingsToUpdate(settings: InstanceSettings): SettingsUpdate {
  return {
    team_label: settings.teamLabel,
    validation_policy: settings.validationPolicy,
    auto_validation_days: settings.autoValidationDays,
    claim_window: `${settings.claimWindowDays} days`,
    request_evidence_policy: settings.requestEvidencePolicy,
    folio_pattern: settings.folioPattern,
    timezone: settings.timezone,
    default_calendar_id: settings.defaultCalendarId,
    sla_clock_mode: settings.slaClockMode,
    requester_visible_event_types: settings.requesterVisibleEventTypes,
  }
}
