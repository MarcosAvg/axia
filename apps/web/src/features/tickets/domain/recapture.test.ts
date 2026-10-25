import {
  applyRecaptureChange,
  initialRecaptureValues,
  missingRecaptureFields,
  recaptureChanges,
} from './recapture'
import type { RecaptureValues } from './recapture'
import type { TicketDetail } from './types'

const ticket = {
  id: 't1',
  folio: 'AX-1',
  status: 'in_progress',
  reportedAt: '2026-10-01T10:00:00Z',
  closedAt: null,
  description: 'No enciende',
  requesterName: 'Ana',
  possibleDuplicate: false,
  buildingName: null,
  categoryName: null,
  priorityName: null,
  teamName: null,
  cycle: 1,
  buildingId: 'b1',
  locationId: 'l1',
  dependencyId: 'd1',
  categoryId: 'c1',
  subcategoryId: 'sc1',
  problemId: 'p1',
  serviceTypeId: 's1',
  priorityId: 'pr1',
  priorityPosition: null,
  locationName: null,
  dependencyName: null,
  subcategoryName: null,
  problemName: null,
  serviceTypeName: null,
  channelName: null,
  requesterContact: null,
  duplicateOfId: null,
} satisfies TicketDetail

describe('initialRecaptureValues', () => {
  it('parte de la captura del tiquet', () => {
    const values = initialRecaptureValues(ticket)
    expect(values.buildingId).toBe('b1')
    expect(values.subcategoryId).toBe('sc1')
    expect(values.reasonId).toBe('')
  })

  it('convierte nulos en cadenas vacías', () => {
    const values = initialRecaptureValues({
      ...ticket,
      subcategoryId: null,
      problemId: null,
    })
    expect(values.subcategoryId).toBe('')
    expect(values.problemId).toBe('')
  })
})

describe('applyRecaptureChange', () => {
  it('limpia la ubicación al cambiar de edificio', () => {
    const values = applyRecaptureChange(
      initialRecaptureValues(ticket),
      'buildingId',
      'b2',
    )
    expect(values.locationId).toBe('')
  })

  it('limpia subcategoría y problema al cambiar de categoría', () => {
    const values = applyRecaptureChange(
      initialRecaptureValues(ticket),
      'categoryId',
      'c2',
    )
    expect(values.subcategoryId).toBe('')
    expect(values.problemId).toBe('')
  })
})

describe('recaptureChanges', () => {
  it('arma el objeto con camelCase y opcionales vacíos a null', () => {
    const values: RecaptureValues = {
      ...initialRecaptureValues(ticket),
      subcategoryId: '',
      problemId: '',
    }
    const changes = recaptureChanges(values)
    expect(changes.subcategoryId).toBeNull()
    expect(changes.problemId).toBeNull()
    expect(changes.categoryId).toBe('c1')
    expect(changes.buildingId).toBe('b1')
    expect(changes.locationId).toBe('l1')
    expect(changes.description).toBe('No enciende')
    expect(changes).not.toHaveProperty('category_id')
  })
})

describe('missingRecaptureFields', () => {
  it('exige motivo, ubicación y descripción útil', () => {
    const values: RecaptureValues = {
      ...initialRecaptureValues(ticket),
      reasonId: '',
      locationId: '',
      description: 'abc',
    }
    expect(missingRecaptureFields(values)).toEqual([
      'locationId',
      'reasonId',
      'description',
    ])
  })

  it('acepta una captura completa', () => {
    expect(
      missingRecaptureFields({
        ...initialRecaptureValues(ticket),
        reasonId: 'r1',
      }),
    ).toEqual([])
  })
})
