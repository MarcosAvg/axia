import { suggestedTimeSpanKind } from './time'

describe('suggestedTimeSpanKind', () => {
  it('sugiere el tramo abierto natural para cada estado', () => {
    expect(suggestedTimeSpanKind('in_progress')).toBe('active_work')
    expect(suggestedTimeSpanKind('paused')).toBe('pause')
    expect(suggestedTimeSpanKind('attended')).toBe('validation')
    expect(suggestedTimeSpanKind('under_claim')).toBe('claim')
    expect(suggestedTimeSpanKind('assigned')).toBe('wait_start')
  })

  it('usa un valor seguro para estados sin tramo abierto', () => {
    expect(suggestedTimeSpanKind('registered')).toBe('supervisor_response')
    expect(suggestedTimeSpanKind('closed')).toBe('validation')
    expect(suggestedTimeSpanKind('rejected')).toBe('active_work')
  })
})
