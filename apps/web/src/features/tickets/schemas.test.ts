import {
  createTicketSchema,
  parseDuplicateCandidates,
  ratingSchema,
  ticketListSearchSchema,
} from './schemas'

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
})

describe('ratingSchema', () => {
  it('acepta una calificación de 1 a 5', () => {
    expect(ratingSchema.safeParse({ score: 4 }).success).toBe(true)
    expect(ratingSchema.safeParse({ score: 0 }).success).toBe(false)
    expect(ratingSchema.safeParse({ score: 6 }).success).toBe(false)
  })
})
