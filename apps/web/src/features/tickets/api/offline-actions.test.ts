import 'fake-indexeddb/auto'
import { db } from '@/lib/offline/db'
import {
  enqueue,
  errorsForCurrentUser,
  processOutbox,
  registerOutboxHandler,
} from '@/lib/offline/outbox'
import { setOfflineUserId } from '@/lib/offline/user'
import { apiFetch } from '@/lib/api-client'
import { sendSyncBatch } from './sync-api'
import type { TicketCommand } from './ticket-commands'
import {
  enqueueTicketAction,
  registerTicketActionHandler,
  submitTicketAction,
} from './offline-actions'
import {
  registerEvidenceUploadHandler,
  saveAndUploadEvidence,
} from './offline-evidence'

vi.mock('./sync-api', () => ({ sendSyncBatch: vi.fn() }))
vi.mock('@/lib/api-client', () => ({ apiFetch: vi.fn(), apiBaseUrl: () => '' }))
vi.mock('@/lib/offline/image', () => ({
  compressImage: async () => new Blob(['photo'], { type: 'image/jpeg' }),
}))

const context = {
  ticketId: 'ticket-a',
  clientRequestId: 'f33c9e64-268a-42a3-8d26-9273035c9b0f',
  occurredLocal: '2026-10-01T10:00',
}

beforeEach(async () => {
  await db.outbox.clear()
  await db.evidences.clear()
  vi.resetAllMocks()
  setOfflineUserId('user-a')
  registerTicketActionHandler()
  registerEvidenceUploadHandler()
  vi.mocked(sendSyncBatch).mockResolvedValue([
    { clientRequestId: context.clientRequestId, status: 'applied' },
  ])
})

afterEach(() => vi.unstubAllGlobals())
afterAll(() => {
  db.close()
  setOfflineUserId(null)
})

it('conserva comando, UUID, hora manual y proxy al encolar y reenviar', async () => {
  await enqueueTicketAction({
    ...context,
    operation: 'start',
    args: { subjectTechnicianId: 'technician-a' },
    manualTime: true,
  })
  expect((await db.outbox.toArray())[0]).toMatchObject({
    orderingKey: 'ticket-a',
  })
  await processOutbox()
  expect(sendSyncBatch).toHaveBeenCalledWith([
    {
      ticketId: context.ticketId,
      clientRequestId: context.clientRequestId,
      type: 'start',
      args: { subjectTechnicianId: 'technician-a' },
      clientReportedAt: expect.any(String),
      occurredLocal: context.occurredLocal,
      manualTime: true,
    },
  ])
  expect(await db.outbox.count()).toBe(0)
})

it('rechaza un comando persistido incompleto antes de HTTP y bloquea los posteriores', async () => {
  await enqueue('ticket_action', {
    ...context,
    operation: 'assign_technician',
    args: {},
  })
  await enqueueTicketAction({ ...context, operation: 'start', args: {} })
  await processOutbox()
  await processOutbox()
  expect(sendSyncBatch).not.toHaveBeenCalled()
  expect(await errorsForCurrentUser()).toHaveLength(1)
  expect(await db.outbox.count()).toBe(2)
})

it('una evidencia antigua fallida bloquea acciones del mismo tiquet entre procesamientos', async () => {
  await db.evidences.add({
    id: 'local-photo',
    userId: 'user-a',
    ticketId: 'ticket-a',
    cycle: 1,
    type: 'before',
    blob: new Blob(['photo']),
    mimeType: 'image/jpeg',
    fileName: 'before.jpg',
    state: 'pending',
    progress: 0,
    createdAt: Date.now(),
  })
  vi.mocked(apiFetch).mockRejectedValue(new Error('Evidencia rechazada'))
  await enqueue('evidence_upload', { evidenceId: 'local-photo' })
  await enqueue('ticket_action', { ...context, operation: 'start', args: {} })
  await enqueueTicketAction({
    ...context,
    ticketId: 'ticket-b',
    operation: 'start',
    args: {},
  })
  await processOutbox()
  await processOutbox()
  expect(sendSyncBatch).toHaveBeenCalledTimes(1)
  expect(sendSyncBatch).toHaveBeenCalledWith([
    expect.objectContaining({ ticketId: 'ticket-b' }),
  ])
  expect(await db.evidences.count()).toBe(1)
  expect(await db.outbox.count()).toBe(2)
})

it('guarda la clave del tiquet también para evidencia nueva sin conexión', async () => {
  vi.stubGlobal('navigator', { onLine: false })
  await saveAndUploadEvidence({
    ticketId: 'ticket-a',
    cycle: 1,
    type: 'before',
    file: new File(['photo'], 'before.jpg'),
  })
  expect((await db.outbox.toArray())[0]).toMatchObject({
    type: 'evidence_upload',
    orderingKey: 'ticket-a',
  })
  expect(apiFetch).not.toHaveBeenCalled()
})

const offlineCommands: TicketCommand[] = [
  { operation: 'start', args: {} },
  { operation: 'advance_pause', args: { reasonId: crypto.randomUUID() } },
]

it.each(offlineCommands)(
  'confirma $operation en el dispositivo sin esperar una solicitud HTTP',
  async (command) => {
    vi.stubGlobal('navigator', { onLine: false })
    await submitTicketAction({ ...context, ...command })
    expect(apiFetch).not.toHaveBeenCalled()
    expect(sendSyncBatch).not.toHaveBeenCalled()
    expect(await db.outbox.toArray()).toMatchObject([
      { state: 'pending', payload: command },
    ])
  },
)

it('reintenta evidencias que una versión anterior bloqueó por un fallo TUS sin respuesta', async () => {
  const upload = vi.fn(async () => {})
  const action = vi.fn(async () => {})
  registerOutboxHandler('evidence_upload', upload)
  registerOutboxHandler('legacy_action', action)
  await enqueue('evidence_upload', {}, 'ticket-legacy')
  await enqueue('legacy_action', {}, 'ticket-legacy')
  const item = await db.outbox.where('type').equals('evidence_upload').first()
  await db.outbox.update(item!.id, {
    state: 'error',
    lastError:
      'tus: failed to create upload, response code: n/a, response text: n/a',
  })
  await processOutbox()
  expect(upload).toHaveBeenCalledOnce()
  expect(action).toHaveBeenCalledOnce()
  expect(await db.outbox.count()).toBe(0)
})

it('encola una pausa confirmada con conexión detrás del inicio pendiente', async () => {
  await enqueueTicketAction({ ...context, operation: 'start', args: {} })
  const [start] = await db.outbox.toArray()
  if (!start) throw new Error('Falta el inicio en la cola')
  await db.outbox.update(start.id, {
    state: 'error',
    lastError: 'Conflicto de inicio',
  })

  await submitTicketAction({
    ...context,
    clientRequestId: crypto.randomUUID(),
    operation: 'pause',
    args: { reasonId: crypto.randomUUID() },
  })

  expect(apiFetch).not.toHaveBeenCalled()
  expect(await db.outbox.toCollection().sortBy('seq')).toMatchObject([
    { id: start.id, state: 'error' },
    {
      orderingKey: 'ticket-a',
      state: 'pending',
      payload: { operation: 'pause' },
    },
  ])
})
