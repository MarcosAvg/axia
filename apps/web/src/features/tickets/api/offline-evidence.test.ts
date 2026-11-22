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

it.each([true, false])(
  'revalida un conflicto TUS con evidencia lista: %s',
  async (ready) => {
    const { saveAndUploadEvidence } = await import('./offline-evidence')
    const api = await import('@/lib/api-client')
    const tus = await import('@/lib/offline/tus')
    const { vi } = await import('vitest')
    const reserve = vi
      .spyOn(api, 'apiFetch')
      .mockResolvedValueOnce({ evidence: { id: 'server-photo', ready: false } })
      .mockResolvedValueOnce({ evidence: { id: 'server-photo', ready } })
    const conflict = Object.assign(new Error('Conflicto TUS'), { status: 409 })
    const upload = vi
      .spyOn(tus, 'uploadResumable')
      .mockRejectedValueOnce(conflict)
    try {
      const result = saveAndUploadEvidence({
        ticketId: 'ticket-race',
        cycle: 1,
        type: 'before',
        file: new File(['pdf'], 'antes.pdf', { type: 'application/pdf' }),
      })
      if (ready) await expect(result).resolves.toEqual(expect.any(String))
      else await expect(result).rejects.toThrow(conflict)
      expect(upload).toHaveBeenCalledTimes(1)
      expect(reserve).toHaveBeenCalledTimes(2)
      expect(reserve.mock.calls[0]).toEqual(reserve.mock.calls[1])
    } finally {
      vi.restoreAllMocks()
    }
  },
)

it('retiene solo hasta siete días las fotos que el servidor rechazó por cierre', async () => {
  const { ApiError } = await import('@/lib/api-client')
  const { db } = await import('@/lib/offline/db')
  const { enqueue, processOutbox } = await import('@/lib/offline/outbox')
  const { setOfflineUserId } = await import('@/lib/offline/user')
  const { OFFLINE_CACHE_TTL_MS } = await import('@/lib/offline/cache-policy')
  const { pruneRejectedEvidence, registerEvidenceUploadHandler } =
    await import('./offline-evidence')
  const { vi } = await import('vitest')
  const userId = 'retention-test'
  const photo = evidence({ userId })
  const pending = evidence({ id: 'pending', userId })
  setOfflineUserId(userId)
  registerEvidenceUploadHandler()
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
  const api = await import('@/lib/api-client')
  vi.spyOn(api, 'apiFetch').mockRejectedValueOnce(
    new ApiError({
      status: 409,
      code: 'evidence_ticket_final',
      message: 'Cerrado',
    }),
  )
  try {
    await db.evidences.bulkAdd([photo, pending])
    await enqueue('evidence_upload', { evidenceId: photo.id }, photo.ticketId)
    await processOutbox()
    expect(await db.outbox.count()).toBe(0)
    const rejectedAt = (await db.evidences.get(photo.id))?.finalRejectedAt
    expect(rejectedAt).toBeTypeOf('number')
    await pruneRejectedEvidence(rejectedAt! + OFFLINE_CACHE_TTL_MS - 1)
    expect(await db.evidences.get(photo.id)).toBeDefined()
    await pruneRejectedEvidence(rejectedAt! + OFFLINE_CACHE_TTL_MS)
    expect(await db.evidences.get(photo.id)).toBeUndefined()
    expect(await db.evidences.get(pending.id)).toBeDefined()
  } finally {
    await db.evidences.clear()
    await db.outbox.clear()
    setOfflineUserId(null)
    vi.restoreAllMocks()
  }
})
