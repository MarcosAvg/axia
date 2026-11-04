import { describe, expect, it } from 'vitest'
import type { ProxySubject } from '../domain/actions'
import { subjectFieldsFor } from './use-ticket-actions'

const technician: ProxySubject = { kind: 'technician', technicianId: 't1' }
const requester: ProxySubject = { kind: 'requester', requesterId: 'r1' }

describe('subjectFieldsFor', () => {
  it('adjunta el técnico solo a las acciones de técnico', () => {
    expect(subjectFieldsFor('start', technician)).toEqual({
      subjectTechnicianId: 't1',
    })
    expect(subjectFieldsFor('recapture', technician)).toEqual({
      subjectTechnicianId: 't1',
    })
    expect(subjectFieldsFor('validate', technician)).toEqual({})
  })

  it('adjunta el solicitante solo a sus acciones proxy', () => {
    for (const operation of [
      'validate',
      'rate',
      'open_claim',
      'cancel',
    ] as const) {
      expect(subjectFieldsFor(operation, requester)).toEqual({
        subjectRequesterId: 'r1',
      })
    }
    expect(subjectFieldsFor('start', requester)).toEqual({})
  })

  it('sin sujeto no adjunta campos', () => {
    expect(subjectFieldsFor('validate', null)).toEqual({})
  })
})
