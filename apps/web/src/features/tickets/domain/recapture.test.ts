import {
  applyRecaptureChange,
  initialRecaptureValues,
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
  it('arma el objeto con snake_case y vacíos a null', () => {
    const values: RecaptureValues = {
      ...initialRecaptureValues(ticket),
      subcategoryId: '',
      problemId: '',
    }
    const changes = recaptureChanges(values)
    expect(changes.subcategory_id).toBeNull()
    expect(changes.problem_id).toBeNull()
    expect(changes.category_id).toBe('c1')
  })
})
