import { currentPauseReasonId, hasOpenPause } from './pause'
import type { TicketPauseStep } from './types'

const step = (reasonId: string, exitedAt: string | null): TicketPauseStep => ({
  pauseId: 'p1',
  reasonId,
  reasonName: reasonId,
  enteredAt: '2026-10-10T10:00:00Z',
  exitedAt,
  note: null,
  actorName: null,
})

describe('currentPauseReasonId', () => {
  it('devuelve el paso abierto', () => {
    expect(
      currentPauseReasonId([
        step('a', '2026-10-10T11:00:00Z'),
        step('b', null),
      ]),
    ).toBe('b')
  })

  it('sin paso abierto devuelve el último', () => {
    expect(currentPauseReasonId([step('a', '2026-10-10T11:00:00Z')])).toBe('a')
  })

  it('sin pasos no hay subestado', () => {
    expect(currentPauseReasonId([])).toBeNull()
  })
})

describe('hasOpenPause', () => {
  it('detecta la pausa abierta', () => {
    expect(hasOpenPause([step('a', null)])).toBe(true)
    expect(hasOpenPause([step('a', '2026-10-10T11:00:00Z')])).toBe(false)
  })
})
