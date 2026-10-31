import { expectTypeOf } from 'vitest'
import { sendTicketCommand, ticketCommandSchema } from './ticket-commands'
import type { ArgsFor, TicketCommand } from './ticket-commands'
import type { useTicketActions } from '../hooks/use-ticket-actions'

const context = {
  ticketId: 't1',
  clientRequestId: 'f33c9e64-268a-42a3-8d26-9273035c9b0f',
}
afterEach(() => vi.unstubAllGlobals())

it('rechaza argumentos incompletos antes de enviar la acción', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}')))
  await expect(
    // @ts-expect-error Prueba la defensa HTTP además del rechazo estático de argumentos incompletos.
    sendTicketCommand({ ...context, operation: 'assign_technician', args: {} }),
  ).rejects.toThrow()
  expect(fetch).not.toHaveBeenCalled()
})

it.each([
  { operation: 'comment', args: { text: 123 } },
  { operation: 'reject', args: { reasonId: '' } },
  { operation: 'resolve_claim', args: { resolution: 'unknown' } },
  { operation: 'recapture', args: { changes: { unsupported: 'x' } } },
])(
  'rechaza argumentos inválidos sin convertirlos en texto: $operation',
  (command) => {
    expect(() => ticketCommandSchema.parse(command)).toThrow()
  },
)

it('conserva UUID, proxy y argumentos tipados en HTTP inmediato', async () => {
  const request = vi.fn().mockResolvedValue(new Response('{}'))
  vi.stubGlobal('fetch', request)
  await sendTicketCommand({
    ...context,
    operation: 'attend',
    args: {
      workDescription: 'Se reparó la lámpara',
      serviceTypeId: 's1',
      subjectTechnicianId: 'u2',
    },
  })
  expect(request).toHaveBeenCalledWith(
    '/api/tickets/t1/actions',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        action: 'attend',
        clientRequestId: context.clientRequestId,
        workDescription: 'Se reparó la lámpara',
        serviceTypeId: 's1',
        subjectTechnicianId: 'u2',
      }),
    }),
  )
})

it('conserva UUID, hora manual y proxy mediante sincronización', async () => {
  const request = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        results: [
          { clientRequestId: context.clientRequestId, status: 'applied' },
        ],
      }),
    ),
  )
  vi.stubGlobal('fetch', request)
  await sendTicketCommand({
    ...context,
    operation: 'start',
    args: { subjectTechnicianId: 'u2' },
    occurredAt: '2026-10-01T10:00:00Z',
    manualTime: true,
  })
  expect(request).toHaveBeenCalledWith(
    '/api/sync/actions',
    expect.objectContaining({
      body: JSON.stringify({
        items: [
          {
            ticketId: 't1',
            clientRequestId: context.clientRequestId,
            type: 'start',
            args: { subjectTechnicianId: 'u2' },
            occurredAt: '2026-10-01T10:00:00Z',
            manualTime: true,
          },
        ],
      }),
    }),
  )
})

it('normaliza opcionales nulos heredados sin inventar argumentos requeridos', () => {
  expect(
    ticketCommandSchema.parse({
      operation: 'pause',
      args: { reasonId: 'r1', note: null, subjectTechnicianId: null },
    }),
  ).toEqual({
    operation: 'pause',
    args: { reasonId: 'r1', note: undefined, subjectTechnicianId: undefined },
  })
})

it('mantiene la correlación entre operación, argumentos y mutaciones', () => {
  expectTypeOf<{
    operation: 'assign_technician'
    args: Record<string, never>
  }>().not.toExtend<TicketCommand>()
  expectTypeOf<{ text: string }>().toExtend<ArgsFor<'comment'>>()
  expectTypeOf<{ reasonId: number }>().not.toExtend<ArgsFor<'reject'>>()
  type Actions = ReturnType<typeof useTicketActions>
  expectTypeOf<
    Parameters<Actions['assignTechnician']['mutate']>[0]
  >().toEqualTypeOf<ArgsFor<'assign_technician'>>()
  expectTypeOf<
    Parameters<Actions['resolveClaim']['mutate']>[0]
  >().toEqualTypeOf<ArgsFor<'resolve_claim'>>()
})
