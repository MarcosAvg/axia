import { describe, expect, it } from 'vitest'
import { splitTeamQueue, withoutOffers } from './inbox'
import type { TicketListItem } from './types'

function ticket(id: string, status: TicketListItem['status']): TicketListItem {
  return { id, status } as TicketListItem
}

describe('splitTeamQueue', () => {
  it('separa lo que aún no tiene técnico de lo que ya está en atención', () => {
    const result = splitTeamQueue([
      ticket('a', 'registered'),
      ticket('b', 'with_supervisor'),
      ticket('c', 'assigned'),
      ticket('d', 'in_progress'),
      ticket('e', 'paused'),
    ])
    expect(result.unassigned.map((item) => item.id)).toEqual(['a', 'b'])
    expect(result.team.map((item) => item.id)).toEqual(['c', 'd', 'e'])
  })
})

describe('withoutOffers', () => {
  it('quita de la cola los tiquets que ya están ofrecidos', () => {
    const result = withoutOffers(
      [ticket('a', 'registered'), ticket('b', 'assigned')],
      new Set(['a']),
    )
    expect(result.map((item) => item.id)).toEqual(['b'])
  })
})
