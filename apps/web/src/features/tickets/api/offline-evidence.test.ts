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

it('revierte la foto si falla el guardado de su entrada offline', async () => {
  const { saveAndUploadEvidence } = await import('./offline-evidence')
  const { db } = await import('@/lib/offline/db')
  const { vi } = await import('vitest')
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
  vi.spyOn(db.outbox, 'add').mockRejectedValueOnce(new Error('Sin espacio'))
  try {
    await expect(
      saveAndUploadEvidence({
        ticketId: 'ticket-atomic',
        cycle: 1,
        type: 'before',
        file: new File(['pdf'], 'antes.pdf', { type: 'application/pdf' }),
      }),
    ).rejects.toThrow('Sin espacio')
    expect(
      await db.evidences.where('ticketId').equals('ticket-atomic').count(),
    ).toBe(0)
  } finally {
    await db.evidences.clear()
    vi.restoreAllMocks()
  }
})

it('no encola una foto para otra cuenta si cambia la sesión durante la preparación', async () => {
  const { saveAndUploadEvidence } = await import('./offline-evidence')
  const { db } = await import('@/lib/offline/db')
  const { setOfflineUserId } = await import('@/lib/offline/user')
  const { vi } = await import('vitest')
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
  setOfflineUserId('first')
  const save = saveAndUploadEvidence({
    ticketId: 'ticket-owner',
    cycle: 1,
    type: 'before',
    file: new File(['pdf'], 'antes.pdf', { type: 'application/pdf' }),
  })
  setOfflineUserId('second')
  try {
    await expect(save).rejects.toThrow(/sesión/)
    expect(await db.evidences.count()).toBe(0)
    expect(await db.outbox.count()).toBe(0)
  } finally {
    await db.evidences.clear()
    await db.outbox.clear()
    setOfflineUserId(null)
    vi.restoreAllMocks()
  }
})

it('revierte la foto al fallar el encolado después de perder la conexión', async () => {
  const { saveAndUploadEvidence } = await import('./offline-evidence')
  const { db } = await import('@/lib/offline/db')
  const { vi } = await import('vitest')
  const api = await import('@/lib/api-client')
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
  vi.spyOn(api, 'apiFetch').mockRejectedValueOnce(
    new TypeError('Failed to fetch'),
  )
  vi.spyOn(db.outbox, 'add').mockRejectedValueOnce(new Error('Sin espacio'))
  try {
    await expect(
      saveAndUploadEvidence({
        ticketId: 'ticket-fallback',
        cycle: 1,
        type: 'before',
        file: new File(['pdf'], 'antes.pdf', { type: 'application/pdf' }),
      }),
    ).rejects.toThrow('Sin espacio')
    expect(await db.evidences.count()).toBe(0)
  } finally {
    await db.evidences.clear()
    vi.restoreAllMocks()
  }
})
