import { randomUUID } from 'node:crypto'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  authHeaders,
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'
import { loadWriteRefs, type WriteRefs } from './tickets-write-helpers.js'

let context: TicketHttpContext
let refs: WriteRefs

function ticketBody(
  description: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    buildingId: refs.buildingId,
    locationId: refs.locationId,
    dependencyId: refs.dependencyId,
    categoryId: refs.categoryId,
    subcategoryId: refs.subcategoryId,
    problemId: refs.problemId,
    serviceTypeId: refs.serviceTypeId,
    priorityId: refs.priorityId,
    channelId: refs.channelId,
    description,
    requesterId: refs.requesterId,
    clientRequestId: randomUUID(),
    ...overrides,
  }
}

const description = () =>
  `Ruido metálico intermitente en el extractor del laboratorio ${randomUUID()}`

async function createTicket(
  text: string,
  overrides: Record<string, unknown> = {},
  cookie = context.cookies.requester,
) {
  const response = await context.app.inject({
    method: 'POST',
    url: '/api/tickets',
    headers: authHeaders(cookie),
    payload: ticketBody(text, overrides),
  })
  expect(response.statusCode).toBe(201)
  return (response.json() as { ticket: { id: string } }).ticket.id
}

async function checkDuplicates(
  text: string,
  cookie = context.cookies.requester,
) {
  const response = await context.app.inject({
    method: 'POST',
    url: '/api/tickets/duplicates',
    headers: authHeaders(cookie),
    payload: {
      buildingId: refs.buildingId,
      locationId: refs.locationId,
      categoryId: refs.categoryId,
      subcategoryId: refs.subcategoryId,
      problemId: refs.problemId,
      dependencyId: refs.dependencyId,
      description: text,
    },
  })
  expect(response.statusCode).toBe(200)
  return (response.json() as { items: Record<string, unknown>[] }).items
}

beforeAll(async () => {
  context = await buildTicketHttpApp()
  refs = await loadWriteRefs(context)
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

async function getSettings() {
  const response = await context.app.inject({
    method: 'GET',
    url: '/api/admin/settings',
    headers: authHeaders(context.cookies.admin),
  })
  expect(response.statusCode).toBe(200)
  return (response.json() as { settings: Record<string, unknown> }).settings
}

function settingsBody(settings: Record<string, unknown>) {
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
    default_priority_id: settings.defaultPriorityId,
    duplicate_window_days: 3,
    duplicate_similarity: 0.45,
    duplicate_shown_fields: ['folio', 'problem'],
  }
}

describe('configuración de duplicados', () => {
  it('guarda y aplica la ventana, el umbral y los campos visibles', async () => {
    const before = await getSettings()
    const patch = await context.app.inject({
      method: 'PATCH',
      url: '/api/admin/settings',
      headers: authHeaders(context.cookies.admin),
      payload: settingsBody(before),
    })
    expect(patch.statusCode).toBe(204)
    const saved = await getSettings()
    expect(saved).toMatchObject({
      duplicateWindowDays: 3,
      duplicateSimilarity: 0.45,
      duplicateShownFields: ['folio', 'problem'],
    })
    const text = description()
    await createTicket(text)
    const items = await checkDuplicates(text)
    expect(items[0]).toHaveProperty('folio')
    expect(items[0]).toHaveProperty('problem')
    expect(items[0]).not.toHaveProperty('building')
    expect(items[0]).not.toHaveProperty('requester_contact')

    const restored = settingsBody(before)
    restored.duplicate_window_days = 7
    restored.duplicate_similarity = 0.3
    restored.duplicate_shown_fields = [
      'folio',
      'status',
      'reported_at',
      'building',
      'problem',
      'requester_contact',
    ]
    await context.app.inject({
      method: 'PATCH',
      url: '/api/admin/settings',
      headers: authHeaders(context.cookies.admin),
      payload: restored,
    })
  })
})

describe('validación de la configuración de duplicados', () => {
  it('rechaza umbrales y ventanas inválidas', async () => {
    const before = await getSettings()
    const body = settingsBody(before)
    expect(
      (
        await context.app.inject({
          method: 'PATCH',
          url: '/api/admin/settings',
          headers: authHeaders(context.cookies.admin),
          payload: { ...body, duplicate_similarity: 2 },
        })
      ).statusCode,
    ).toBe(400)
    expect(
      (
        await context.app.inject({
          method: 'PATCH',
          url: '/api/admin/settings',
          headers: authHeaders(context.cookies.admin),
          payload: { ...body, duplicate_window_days: 0 },
        })
      ).statusCode,
    ).toBe(400)
  })
})
