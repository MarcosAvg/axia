import { describe, expect, it } from 'vitest'
import { countByStatus, summarizeWork } from './summary'

describe('summarizeWork', () => {
  it('cuenta los tiquets por estado', () => {
    const summary = summarizeWork([
      { status: 'in_progress' },
      { status: 'paused' },
      { status: 'attended' },
      { status: 'paused' },
      { status: 'assigned' },
    ])

    expect(summary).toEqual({
      total: 5,
      inProgress: 1,
      paused: 2,
      attended: 1,
    })
  })

  it('devuelve ceros con una lista vacía', () => {
    expect(summarizeWork([])).toEqual({
      total: 0,
      inProgress: 0,
      paused: 0,
      attended: 0,
    })
  })
})

describe('countByStatus', () => {
  it('cuenta por estado y ordena de mayor a menor', () => {
    expect(
      countByStatus([
        { status: 'paused' },
        { status: 'in_progress' },
        { status: 'paused' },
        { status: 'closed' },
      ]),
    ).toEqual([
      { status: 'paused', count: 2 },
      { status: 'in_progress', count: 1 },
      { status: 'closed', count: 1 },
    ])
  })

  it('tolera listas vacías', () => {
    expect(countByStatus([])).toEqual([])
  })
})
