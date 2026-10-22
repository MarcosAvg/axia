import { EMPTY_ACTION_VALUES } from './action-values'
import { missingActionFields } from './action-validation'

describe('missingActionFields', () => {
  it('exige los campos propios de cada acción', () => {
    expect(
      missingActionFields('assign_technician', EMPTY_ACTION_VALUES, true),
    ).toEqual(['technician'])
    expect(missingActionFields('pause', EMPTY_ACTION_VALUES, true)).toEqual([
      'reason',
    ])
    expect(
      missingActionFields('change_priority', EMPTY_ACTION_VALUES, true),
    ).toEqual(['priority'])
  })

  it('exige evidencia y texto para marcar atendido', () => {
    expect(missingActionFields('attend', EMPTY_ACTION_VALUES, false)).toEqual([
      'serviceType',
      'text',
      'evidence',
    ])
    expect(
      missingActionFields(
        'attend',
        {
          ...EMPTY_ACTION_VALUES,
          serviceTypeId: 'service',
          text: 'Trabajo realizado',
        },
        true,
      ),
    ).toEqual([])
  })

  it('trata los espacios como texto vacío y deja opcional el avance', () => {
    expect(
      missingActionFields(
        'comment',
        { ...EMPTY_ACTION_VALUES, text: '   ' },
        true,
      ),
    ).toEqual(['text'])
    expect(
      missingActionFields('record_progress', EMPTY_ACTION_VALUES, true),
    ).toEqual([])
  })

  it('no inventa requisitos para acciones sin campos obligatorios', () => {
    expect(
      missingActionFields('resolve_claim', EMPTY_ACTION_VALUES, false),
    ).toEqual([])
    expect(missingActionFields('validate', EMPTY_ACTION_VALUES, false)).toEqual(
      [],
    )
  })
})
