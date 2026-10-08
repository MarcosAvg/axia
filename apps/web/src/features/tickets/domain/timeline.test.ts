import { groupTimelineByCycle, timelineNote } from './timeline'
import type { TicketTimelineItem } from './types'

function item(
  id: number,
  cycle: number,
  payload: Record<string, unknown> = {},
): TicketTimelineItem {
  return {
    id,
    cycle,
    type: 'comment',
    occurredAt: '2026-10-01T10:00:00Z',
    actorName: 'Ana',
    subjectTechnicianName: null,
    reasonName: null,
    payload,
  }
}

describe('groupTimelineByCycle', () => {
  it('agrupa por ciclo en orden ascendente', () => {
    const groups = groupTimelineByCycle([item(1, 2), item(2, 1), item(3, 2)])
    expect(groups.map((group) => group.cycle)).toEqual([1, 2])
    expect(groups[1]?.items).toHaveLength(2)
  })

  it('devuelve vacío sin elementos', () => {
    expect(groupTimelineByCycle([])).toEqual([])
  })
})

describe('timelineNote', () => {
  it('prefiere el texto del comentario', () => {
    expect(timelineNote(item(1, 1, { text: 'nota' }))).toBe('nota')
  })

  it('usa la descripción del trabajo', () => {
    expect(
      timelineNote(item(1, 1, { work_description: 'cambié el foco' })),
    ).toBe('cambié el foco')
  })

  it('devuelve null sin texto', () => {
    expect(timelineNote(item(1, 1, {}))).toBeNull()
  })
})
