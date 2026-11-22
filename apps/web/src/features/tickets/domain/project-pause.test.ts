import type { ReasonOption } from '@/features/catalogs'
import type { PendingTicketAction } from './pending-actions'
import { projectPause } from './project-pause'

function reason(
  id: string,
  pauseStepKind: ReasonOption['pauseStepKind'],
  transitionIds?: string[],
): ReasonOption {
  return {
    id,
    name: id,
    use: 'pause',
    parentId: null,
    pauseStepKind,
    transitionIds,
  }
}

function command(
  operation: 'pause' | 'advance_pause',
  reasonId: string,
  seq: number,
): PendingTicketAction {
  return {
    id: String(seq),
    ticketId: 'ticket',
    seq,
    operation,
    args: { reasonId },
    occurredAt: new Date(seq).toISOString(),
  }
}

it('deriva avances y salidas por conexión explícita del último paso local', () => {
  const catalog = [
    reason('motivo', null, ['paso']),
    reason('paso', 'progress', ['salida']),
    reason('salida', 'exit', []),
    reason('otra salida', 'exit', []),
  ]
  const pause = command('pause', 'motivo', 1)
  expect(projectPause(null, [pause], catalog)).toMatchObject({
    currentId: 'motivo',
    advanceOptions: [{ id: 'paso' }],
    exitOptions: [],
  })
  expect(
    projectPause(null, [pause, command('advance_pause', 'paso', 2)], catalog),
  ).toMatchObject({
    currentId: 'paso',
    exitOptions: [{ id: 'salida' }],
  })
})

it('omite las salidas anteriores cuando el avance carece de conexiones guardadas', () => {
  const catalog = [
    reason('motivo', null, ['paso', 'salida']),
    reason('paso', 'progress'),
    reason('salida', 'exit', []),
  ]
  const confirmed = projectPause(null, [command('pause', 'motivo', 1)], catalog)
  expect(confirmed?.exitOptions).toHaveLength(1)
  expect(
    projectPause(confirmed, [command('advance_pause', 'paso', 2)], catalog),
  ).toBeNull()
})
