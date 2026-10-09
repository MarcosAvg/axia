import { describe, expect, it } from 'vitest'
import { allowedEvidenceTypes } from './evidence'

describe('allowedEvidenceTypes', () => {
  it('solo permite la evidencia de solicitud al registrar', () => {
    expect(allowedEvidenceTypes('registered')).toContain('request')
    expect(allowedEvidenceTypes('registered')).not.toContain('before')
  })

  it('permite "antes" cuando está asignado', () => {
    expect(allowedEvidenceTypes('assigned')).toEqual(['before', 'other'])
  })

  it('permite "durante" y "después" en proceso o pausado', () => {
    expect(allowedEvidenceTypes('in_progress')).toContain('during')
    expect(allowedEvidenceTypes('paused')).toContain('after')
  })

  it('permite la evidencia de reclamación en atendido o reclamación', () => {
    expect(allowedEvidenceTypes('attended')).toContain('claim')
    expect(allowedEvidenceTypes('under_claim')).toContain('claim')
  })

  it('no permite evidencia en estados de descarte', () => {
    expect(allowedEvidenceTypes('rejected')).toEqual([])
    expect(allowedEvidenceTypes('duplicate')).toEqual([])
  })
})
