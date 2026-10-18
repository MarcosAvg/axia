import { describe, expect, it } from 'vitest'
import { ticketPageInfo } from './ticket-page'

describe('ticketPageInfo', () => {
  it('normaliza una página cargada', () => {
    const info = ticketPageInfo({
      items: [],
      total: 21,
      pageSize: 20,
    })
    expect(info.totalPages).toBe(2)
    expect(info.total).toBe(21)
  })

  it('usa valores seguros mientras no hay datos', () => {
    expect(ticketPageInfo()).toEqual({
      items: [],
      total: 0,
      pageSize: 20,
      totalPages: 1,
    })
  })
})
