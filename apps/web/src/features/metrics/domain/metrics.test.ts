import {
  EMPTY_FILTERS,
  averageOf,
  byDimension,
  filterTickets,
  formatMinutes,
  formatPercent,
  formatScore,
  intervalToMinutes,
  openAging,
  summarize,
  toCsv,
  volumeByDate,
} from './metrics'
import type { MetricsTicket } from './metrics'
import { deltaOf, formatDelta, previousRange, rangeForDays } from './period'

function ticket(partial: Partial<MetricsTicket>): MetricsTicket {
  return {
    id: 't1',
    folio: 'AX-1',
    status: 'closed',
    reportedAt: '2026-10-05T08:00:00Z',
    buildingId: 'b1',
    categoryId: 'c1',
    teamId: 'tm1',
    dependencyId: 'd1',
    requesterId: 'r1',
    totalMinutes: 240,
    netMinutes: 180,
    activeMinutes: 60,
    activeLaborMinutes: 60,
    activeExtraMinutes: 0,
    responseMinutes: 15,
    assignmentMinutes: 30,
    validationMinutes: 20,
    reassigned: false,
    reassignedTechnician: false,
    recaptured: false,
    reopened: false,
    ...partial,
  }
}

describe('intervalToMinutes', () => {
  it('lee tiempos y días', () => {
    expect(intervalToMinutes('04:05:00')).toBe(245)
    expect(intervalToMinutes('1 day 02:00:00')).toBe(1560)
    expect(intervalToMinutes(null)).toBe(0)
    expect(intervalToMinutes('-00:30:00')).toBe(-30)
  })
})

describe('formatMinutes y formatPercent', () => {
  it('formatea duraciones y porcentajes', () => {
    expect(formatMinutes(0)).toBe('0 min')
    expect(formatMinutes(45)).toBe('45 min')
    expect(formatMinutes(120)).toBe('2 h')
    expect(formatMinutes(135)).toBe('2 h 15 min')
    expect(formatPercent(0.25)).toBe('25%')
  })
})

describe('filterTickets', () => {
  const tickets = [
    ticket({ id: 'a', reportedAt: '2026-10-01T08:00:00Z', teamId: 'tm1' }),
    ticket({ id: 'b', reportedAt: '2026-10-10T08:00:00Z', teamId: 'tm2' }),
  ]

  it('filtra por rango de fechas y dimensión', () => {
    const result = filterTickets(tickets, {
      ...EMPTY_FILTERS,
      from: '2026-10-05',
      to: '2026-10-31',
      teamId: 'tm2',
    })
    expect(result.map((item) => item.id)).toEqual(['b'])
  })

  it('sin filtros devuelve todo', () => {
    expect(filterTickets(tickets, EMPTY_FILTERS)).toHaveLength(2)
  })
})

describe('summarize', () => {
  it('calcula tasas y promedios', () => {
    const summary = summarize([
      ticket({ id: 'a', reopened: false, activeMinutes: 60 }),
      ticket({
        id: 'b',
        reopened: true,
        reassigned: true,
        reassignedTechnician: true,
        activeMinutes: 120,
      }),
    ])
    expect(summary.tickets).toBe(2)
    expect(summary.reassignmentRate).toBe(0.5)
    expect(summary.technicianReassignmentRate).toBe(0.5)
    expect(summary.reopenRate).toBe(0.5)
    expect(summary.firstTimeFixRate).toBe(0.5)
    expect(summary.avgActive).toBe(90)
  })
})

describe('volumeByDate', () => {
  it('agrupa por día en orden', () => {
    const points = volumeByDate([
      ticket({ id: 'a', reportedAt: '2026-10-02T08:00:00Z' }),
      ticket({ id: 'b', reportedAt: '2026-10-01T09:00:00Z' }),
      ticket({ id: 'c', reportedAt: '2026-10-01T18:00:00Z' }),
    ])
    expect(points).toEqual([
      { date: '2026-10-01', tickets: 2 },
      { date: '2026-10-02', tickets: 1 },
    ])
  })
})

describe('byDimension', () => {
  it('agrupa y ordena por volumen', () => {
    const rows = byDimension(
      [
        ticket({ id: 'a', teamId: 'tm1' }),
        ticket({ id: 'b', teamId: 'tm1' }),
        ticket({ id: 'c', teamId: 'tm2' }),
      ],
      'team',
    )
    expect(rows[0]).toMatchObject({ id: 'tm1', tickets: 2 })
    expect(rows[1]).toMatchObject({ id: 'tm2', tickets: 1 })
  })

  it('agrupa por solicitante', () => {
    const rows = byDimension(
      [
        ticket({ id: 'a', requesterId: 'r1' }),
        ticket({ id: 'b', requesterId: 'r2' }),
        ticket({ id: 'c', requesterId: 'r2' }),
      ],
      'requester',
    )
    expect(rows[0]).toMatchObject({ id: 'r2', tickets: 2 })
    expect(rows[1]).toMatchObject({ id: 'r1', tickets: 1 })
  })
})

describe('openAging', () => {
  it('incluye pendientes y ordena por antigüedad', () => {
    const now = new Date('2026-10-10T08:00:00Z')
    const rows = openAging(
      [
        ticket({
          id: 'a',
          status: 'in_progress',
          reportedAt: '2026-10-09T08:00:00Z',
        }),
        ticket({
          id: 'b',
          status: 'registered',
          reportedAt: '2026-10-08T08:00:00Z',
        }),
        ticket({
          id: 'c',
          status: 'closed',
          reportedAt: '2026-10-01T08:00:00Z',
        }),
      ],
      now,
    )
    expect(rows.map((row) => row.id)).toEqual(['b', 'a'])
    expect(rows[0]?.ageMinutes).toBe(2880)
  })
})

describe('toCsv', () => {
  it('escapa comas y comillas', () => {
    const csv = toCsv(
      ['a', 'b'],
      [
        ['x,y', 'z"w'],
        [1, 2],
      ],
    )
    expect(csv).toBe('a,b\n"x,y","z""w"\n1,2')
  })
})

describe('averageOf', () => {
  it('promedia y tolera listas vacías', () => {
    expect(averageOf([10, 20, 30])).toBe(20)
    expect(averageOf([])).toBe(0)
  })
})

describe('formatScore', () => {
  it('formatea la satisfacción promedio', () => {
    expect(formatScore(4.25)).toBe('4.3 / 5')
    expect(formatScore(null)).toBe('—')
  })
})

describe('rangeForDays', () => {
  it('devuelve el rango de los últimos N días, terminando hoy', () => {
    const now = new Date(2026, 9, 15)
    expect(rangeForDays(7, now)).toEqual({
      from: '2026-10-08',
      to: '2026-10-15',
    })
  })
})

describe('previousRange', () => {
  it('desplaza el rango por su longitud', () => {
    expect(
      previousRange({ ...EMPTY_FILTERS, from: '2026-10-08', to: '2026-10-15' }),
    ).toEqual({ ...EMPTY_FILTERS, from: '2026-09-30', to: '2026-10-07' })
  })

  it('devuelve null sin rango completo', () => {
    expect(previousRange(EMPTY_FILTERS)).toBeNull()
    expect(previousRange({ ...EMPTY_FILTERS, from: '2026-10-08' })).toBeNull()
  })
})

describe('deltaOf y formatDelta', () => {
  it('calcula el cambio relativo', () => {
    expect(deltaOf(120, 100)).toBeCloseTo(0.2)
    expect(deltaOf(80, 100)).toBeCloseTo(-0.2)
    expect(deltaOf(10, 0)).toBeNull()
  })

  it('formatea con signo', () => {
    expect(formatDelta(0.2)).toBe('+20%')
    expect(formatDelta(-0.2)).toBe('-20%')
    expect(formatDelta(0)).toBe('0%')
    expect(formatDelta(null)).toBe('—')
  })
})
