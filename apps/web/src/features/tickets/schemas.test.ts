import {
  createTicketSchema,
  parseDuplicateCandidates,
  parseTicketDetail,
  parseTicketListItem,
  parseTimelineItem,
  ticketListSearchSchema,
} from './schemas'

const listRow = {
  id: 't1',
  folio: 'AX-2026-1',
  status: 'in_progress',
  reported_at: '2026-10-01T10:00:00Z',
  closed_at: null,
  description: 'No enciende la luz',
  requester_name: 'Ana Pérez',
  possible_duplicate: false,
  building: { name: 'Edificio A' },
  category: { name: 'Eléctrico' },
  priority: { name: 'Media' },
  team: { name: 'Mantenimiento' },
}

describe('parseTicketListItem', () => {
  it('convierte la fila en un elemento de lista', () => {
    const item = parseTicketListItem(listRow)
    expect(item.buildingName).toBe('Edificio A')
    expect(item.status).toBe('in_progress')
    expect(item.possibleDuplicate).toBe(false)
  })

  it('tolera referencias nulas', () => {
    const item = parseTicketListItem({ ...listRow, priority: null })
    expect(item.priorityName).toBeNull()
  })

  it('rechaza un estado desconocido', () => {
    expect(() =>
      parseTicketListItem({ ...listRow, status: 'volando' }),
    ).toThrow()
  })
})

describe('parseTicketDetail', () => {
  it('incluye la captura y los nombres', () => {
    const detail = parseTicketDetail({
      ...listRow,
      cycle: 1,
      building_id: 'b1',
      location_id: 'l1',
      dependency_id: 'd1',
      category_id: 'c1',
      subcategory_id: null,
      problem_id: null,
      service_type_id: 's1',
      priority_id: 'p1',
      requester_contact: 'ext. 100',
      duplicate_of_id: null,
      location: { name: 'Planta baja' },
      dependency: { name: 'Sistemas' },
      subcategory: null,
      problem: null,
      service_type: { name: 'Correctivo' },
      channel: { name: 'Web' },
    })
    expect(detail.locationName).toBe('Planta baja')
    expect(detail.subcategoryName).toBeNull()
    expect(detail.requesterContact).toBe('ext. 100')
  })
})

describe('parseTimelineItem', () => {
  it('normaliza el payload nulo a objeto vacío', () => {
    const item = parseTimelineItem({
      id: 1,
      cycle: 1,
      type: 'comment',
      payload: null,
      occurred_at: '2026-10-01T10:00:00Z',
      actor_name: 'Ana',
      subject_technician_name: null,
      reason_name: null,
    })
    expect(item.payload).toEqual({})
    expect(item.actorName).toBe('Ana')
  })
})

describe('parseDuplicateCandidates', () => {
  it('acepta un arreglo de candidatos', () => {
    expect(
      parseDuplicateCandidates([{ folio: 'AX-1', status: 'attended' }]),
    ).toHaveLength(1)
  })

  it('devuelve vacío si no es arreglo', () => {
    expect(parseDuplicateCandidates(null)).toEqual([])
  })
})

describe('createTicketSchema', () => {
  const valid = {
    buildingId: 'b1',
    locationId: 'l1',
    dependencyId: 'd1',
    categoryId: 'c1',
    serviceTypeId: 's1',
    priorityId: 'p1',
    channelId: 'ch1',
    description: 'No enciende la luz del pasillo',
    requesterId: 'r1',
  }

  it('acepta una captura completa', () => {
    expect(createTicketSchema.safeParse(valid).success).toBe(true)
  })

  it('rechaza falta de descripción útil', () => {
    expect(
      createTicketSchema.safeParse({ ...valid, description: 'no' }).success,
    ).toBe(false)
  })
})

describe('ticketListSearchSchema', () => {
  it('normaliza la página y acepta filtros', () => {
    const parsed = ticketListSearchSchema.parse({
      page: '2',
      status: 'closed',
      buildingId: 'b1',
    })
    expect(parsed.page).toBe(2)
    expect(parsed.status).toBe('closed')
  })

  it('ignora un estado inválido y usa página 1 por defecto', () => {
    const parsed = ticketListSearchSchema.parse({ status: 'nope', page: 'x' })
    expect(parsed.status).toBeUndefined()
    expect(parsed.page).toBe(1)
  })
})
