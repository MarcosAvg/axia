import { sql } from 'drizzle-orm'

import { assertTimeZone } from '../lib/timezone.js'

import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'

export type SettingsInput = {
  team_label: string
  validation_policy: string
  auto_validation_days: number | null
  claim_window: string
  request_evidence_policy: string
  folio_pattern: string
  timezone: string
  default_calendar_id: string | null
  sla_clock_mode: string
  requester_visible_event_types: string[]
  default_priority_id: string | null
  duplicate_window_days: number
  duplicate_similarity: number
  duplicate_shown_fields: string[]
}

function textArray(value: string[] | string): string[] {
  if (Array.isArray(value)) return value
  return value
    .replace(/^\{|\}$/g, '')
    .split(',')
    .filter(Boolean)
}

export async function getSettings(db: Database) {
  const result = await db.execute(sql`
    select
      team_label, validation_policy, auto_validation_days,
      extract(day from claim_window)::int as claim_window_days,
      request_evidence_policy, folio_pattern, timezone,
      default_calendar_id, sla_clock_mode,
      requester_visible_event_types, default_priority_id,
      extract(day from duplicate_window)::int as duplicate_window_days,
      duplicate_similarity, duplicate_shown_fields
    from public.instance_settings limit 1
  `)
  const row = result.rows[0] as
    | {
        team_label: string
        validation_policy: string
        auto_validation_days: number | null
        claim_window_days: number
        request_evidence_policy: string
        folio_pattern: string
        timezone: string
        default_calendar_id: string | null
        sla_clock_mode: string
        requester_visible_event_types: string[] | string
        default_priority_id: string | null
        duplicate_window_days: number
        duplicate_similarity: string
        duplicate_shown_fields: string[]
      }
    | undefined
  if (!row)
    throw new AppError(500, 'settings_missing', 'Falta la configuración')
  return {
    teamLabel: row.team_label,
    validationPolicy: row.validation_policy,
    autoValidationDays: row.auto_validation_days,
    claimWindowDays: row.claim_window_days,
    requestEvidencePolicy: row.request_evidence_policy,
    folioPattern: row.folio_pattern,
    timezone: row.timezone,
    defaultCalendarId: row.default_calendar_id,
    slaClockMode: row.sla_clock_mode,
    requesterVisibleEventTypes: textArray(row.requester_visible_event_types),
    defaultPriorityId: row.default_priority_id,
    duplicateWindowDays: row.duplicate_window_days,
    duplicateSimilarity: Number(row.duplicate_similarity),
    duplicateShownFields: row.duplicate_shown_fields,
  }
}

export async function updateSettings(db: Database, input: SettingsInput) {
  assertTimeZone(input.timezone)
  const days = Number(input.claim_window.match(/\d+/)?.[0] ?? 1)
  await db.execute(sql`
    update public.instance_settings set
      team_label = ${input.team_label},
      validation_policy = ${input.validation_policy},
      auto_validation_days = ${input.auto_validation_days},
      claim_window = make_interval(days => ${days}),
      request_evidence_policy = ${input.request_evidence_policy},
      folio_pattern = ${input.folio_pattern},
      timezone = ${input.timezone},
      default_calendar_id = ${input.default_calendar_id},
      sla_clock_mode = ${input.sla_clock_mode},
      requester_visible_event_types = string_to_array(
        ${input.requester_visible_event_types.join(',')}, ','
      )::public.event_type[],
      default_priority_id = ${input.default_priority_id},
      duplicate_window = make_interval(days => ${input.duplicate_window_days}),
      duplicate_similarity = ${input.duplicate_similarity},
      duplicate_shown_fields = string_to_array(
        ${input.duplicate_shown_fields.join(',')}, ','
      )::text[]
    where singleton
  `)
}
