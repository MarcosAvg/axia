import { isFinalStatus, stageIndex, statusStage, statusTone } from './status'

describe('isFinalStatus', () => {
  it('considera finales a cerrado, rechazado, cancelado y duplicado', () => {
    expect(isFinalStatus('closed')).toBe(true)
    expect(isFinalStatus('rejected')).toBe(true)
    expect(isFinalStatus('cancelled')).toBe(true)
    expect(isFinalStatus('duplicate')).toBe(true)
  })

  it('no considera finales a los estados activos', () => {
    expect(isFinalStatus('registered')).toBe(false)
    expect(isFinalStatus('in_progress')).toBe(false)
    expect(isFinalStatus('attended')).toBe(false)
  })
})

describe('statusTone', () => {
  it('agrupa los estados por tono', () => {
    expect(statusTone('registered')).toBe('neutral')
    expect(statusTone('in_progress')).toBe('progress')
    expect(statusTone('paused')).toBe('paused')
    expect(statusTone('closed')).toBe('done')
    expect(statusTone('cancelled')).toBe('discarded')
  })
})

describe('statusStage', () => {
  it('ubica los estados activos en su etapa del flujo', () => {
    expect(statusStage('registered')).toBe('registered')
    expect(statusStage('assigned')).toBe('assigned')
    expect(statusStage('paused')).toBe('in_progress')
    expect(statusStage('under_claim')).toBe('attended')
    expect(stageIndex('attended')).toBe(4)
  })

  it('no asigna etapa a los estados de descarte', () => {
    expect(statusStage('rejected')).toBeNull()
    expect(statusStage('cancelled')).toBeNull()
    expect(statusStage('duplicate')).toBeNull()
  })
})
