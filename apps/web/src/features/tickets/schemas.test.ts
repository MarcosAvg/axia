import {
  createTicketSchema,
  parseDuplicateCandidates,
  ratingSchema,
  ticketListSearchSchema,
  ticketPageResponseSchema,
} from './schemas'

describe('parseDuplicateCandidates', () => {
  it('acepta un arreglo de candidatos', () => {
    expect(
      parseDuplicateCandidates([
        {
          id: 't1',
          score: 0.75,
          similarity: 0.6,
          reasons: ['location'],
          folio: 'AX-1',
          status: 'attended',
        },
      ]),
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
    subcategoryId: 'sc1',
    problemId: 'pr1',
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

  it('acepta los filtros ampliados y normaliza los indicadores', () => {
    const parsed = ticketListSearchSchema.parse({
      teamId: 'team-1',
      priorityId: 'priority-1',
      requesterId: 'requester-1',
      technicianId: 'technician-1',
      dependencyId: 'dependency-1',
      serviceTypeId: 'service-1',
      from: '2026-01-01',
      to: '2026-01-31',
      unrouted: 'true',
      possibleDuplicate: 'false',
    })
    expect(parsed).toMatchObject({
      teamId: 'team-1',
      priorityId: 'priority-1',
      requesterId: 'requester-1',
      technicianId: 'technician-1',
      dependencyId: 'dependency-1',
      serviceTypeId: 'service-1',
      from: '2026-01-01',
      to: '2026-01-31',
      unrouted: true,
      possibleDuplicate: false,
    })
  })
})

describe('ticketPageResponseSchema', () => {
  it('conserva la ubicación y el técnico del listado', () => {
    const parsed = ticketPageResponseSchema.parse({
      items: [
        {
          id: 't1',
          folio: 'A-1',
          status: 'registered',
          reportedAt: '2026-01-01T00:00:00Z',
          closedAt: null,
          description: 'Fuga',
          requesterName: 'Ana',
          possibleDuplicate: false,
          buildingName: 'Edificio',
          locationName: 'Sala',
          categoryName: 'Eléctrico',
          priorityName: 'Alta',
          priorityPosition: 1,
          teamName: 'Mantenimiento',
          technicianName: 'Luis',
          isUnrouted: false,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    })
    expect(parsed.items[0]).toMatchObject({
      locationName: 'Sala',
      technicianName: 'Luis',
    })
  })
})

describe('ratingSchema', () => {
  it('acepta una calificación de 1 a 5', () => {
    expect(ratingSchema.safeParse({ score: 4 }).success).toBe(true)
    expect(ratingSchema.safeParse({ score: 0 }).success).toBe(false)
    expect(ratingSchema.safeParse({ score: 6 }).success).toBe(false)
  })
})
