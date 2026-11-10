import 'fake-indexeddb/auto'

import { describe, expect, it } from 'vitest'
import type { Evidence } from '@/lib/offline/db'
import { buildEvidenceUploadBody } from './offline-evidence'

function evidence(overrides: Partial<Evidence> = {}): Evidence {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    ticketId: '22222222-2222-4222-8222-222222222222',
    cycle: 2,
    type: 'before',
    blob: new Blob(['x'], { type: 'image/webp' }),
    mimeType: 'image/webp',
    fileName: 'antes.webp',
    state: 'pending',
    progress: 0,
    createdAt: Date.now(),
    ...overrides,
  }
}

describe('buildEvidenceUploadBody', () => {
  it('envía ciclo y hora del dispositivo cuando la captura fue offline', () => {
    const body = buildEvidenceUploadBody(
      evidence({ clientCapturedAt: '2026-11-10T10:00:00.000Z' }),
      'before',
    )
    expect(body.cycle).toBe(2)
    expect(body.clientCapturedAt).toBe('2026-11-10T10:00:00.000Z')
    expect(typeof body.deviceNow).toBe('string')
  })

  it('no envía hora del dispositivo en una subida en línea', () => {
    const body = buildEvidenceUploadBody(evidence(), 'before')
    expect(body.cycle).toBe(2)
    expect(body.clientCapturedAt).toBeUndefined()
    expect(body.deviceNow).toBeUndefined()
  })
})
