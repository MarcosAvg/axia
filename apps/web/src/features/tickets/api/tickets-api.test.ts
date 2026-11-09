import {
  fetchMyOffers,
  fetchMyWork,
  fetchTicket,
  fetchTickets,
  fetchTimeline,
  searchTicketsByFolio,
} from './tickets-api'
import { fetchRating } from './rating-api'

const item = {
  id: 't1',
  folio: 'AX-1',
  status: 'in_progress',
  reportedAt: '2026-10-01T10:00:00Z',
  closedAt: null,
  description: 'No enciende la luz',
  requesterName: 'Ana',
  possibleDuplicate: false,
  isUnrouted: false,
  buildingName: 'A',
  locationName: 'Sala',
  categoryName: null,
  priorityName: null,
  priorityPosition: null,
  teamName: null,
  technicianName: 'Luis',
}
const detail = {
  ...item,
  cycle: 1,
  buildingId: 'b1',
  locationId: 'l1',
  dependencyId: 'd1',
  categoryId: 'c1',
  subcategoryId: null,
  problemId: null,
  serviceTypeId: null,
  priorityId: 'p1',
  locationName: null,
  dependencyName: null,
  subcategoryName: null,
  problemName: null,
  serviceTypeName: null,
  channelName: null,
  requesterContact: null,
  duplicateOfId: null,
  duplicateOfFolio: null,
  isRequester: false,
  requesterValidated: false,
  supervisorValidated: false,
  canValidateRequester: true,
  canValidateSupervisor: true,
  hasTaken: false,
  requesterId: 'r1',
  requesterDependencyId: 'rd1',
  requesterDependencyName: 'Dependencia del solicitante',
  validationPolicy: 'both',
  cycleTimes: {
    total: 20,
    response: 1,
    assignment: 2,
    pendingTake: 0,
    reassignment: 0,
    wait: 3,
    active: 14,
    pause: 0,
    validation: 0,
    claim: 0,
  },
}
function respond(body: unknown, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })),
  )
}
afterEach(() => vi.unstubAllGlobals())

describe('DTO HTTP de tiquets', () => {
  it('acepta nombres camelCase y tiempos del detalle vigente', async () => {
    respond({ ticket: detail })
    expect(await fetchTicket('t1')).toEqual(detail)
  })
  it('rechaza el detalle si falta un tiempo del ciclo', async () => {
    respond({ ticket: { ...detail, cycleTimes: { total: 20 } } })
    await expect(fetchTicket('t1')).rejects.toThrow()
  })
  it.each([
    () => fetchTickets({}, 1),
    () => fetchMyWork('u1'),
    () => fetchMyOffers('u1'),
    () => searchTicketsByFolio('AX'),
  ])(
    'rechaza estados inválidos en todas las listas HTTP',
    async (fetchList) => {
      respond({
        items: [{ ...item, status: 'volando' }],
        total: 1,
        page: 1,
        pageSize: 20,
      })
      await expect(fetchList()).rejects.toThrow()
    },
  )
  it('conserva paginación y referencias nulas de la lista', async () => {
    respond({ items: [item], total: 1, page: 2, pageSize: 20 })
    expect(await fetchTickets({}, 2)).toEqual({
      items: [item],
      total: 1,
      page: 2,
      pageSize: 20,
    })
  })
  it('rechaza totales de lista que no son números', async () => {
    respond({ items: [item], total: '1', page: 1, pageSize: 20 })
    await expect(fetchTickets({}, 1)).rejects.toThrow()
  })
  it('envía el tamaño de página que pide el tablero', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ items: [], total: 0, page: 1, pageSize: 100 }),
          { status: 200 },
        ),
      )
    vi.stubGlobal('fetch', fetchMock)

    await fetchTickets({ statuses: ['registered'] }, 1, 100)

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('pageSize=100')
  })
})

describe('DTO HTTP de timeline', () => {
  it('normaliza solamente el payload nulo del timeline', async () => {
    respond({
      items: [
        {
          id: 1,
          cycle: 1,
          type: 'comment',
          occurredAt: item.reportedAt,
          actorName: 'Ana',
          subjectTechnicianName: null,
          subjectRequesterName: null,
          subjectUserName: null,
          reasonName: null,
          payload: null,
        },
      ],
    })
    expect(await fetchTimeline('t1')).toEqual([
      {
        id: 1,
        cycle: 1,
        type: 'comment',
        occurredAt: item.reportedAt,
        actorName: 'Ana',
        subjectTechnicianName: null,
        subjectRequesterName: null,
        subjectUserName: null,
        reasonName: null,
        payload: {},
      },
    ])
  })
  it('rechaza eventos desconocidos del timeline', async () => {
    respond({
      items: [
        {
          id: 1,
          cycle: 1,
          type: 'volando',
          occurredAt: item.reportedAt,
          actorName: null,
          subjectTechnicianName: null,
          subjectRequesterName: null,
          subjectUserName: null,
          reasonName: null,
          payload: {},
        },
      ],
    })
    await expect(fetchTimeline('t1')).rejects.toThrow()
  })
})

describe('DTO HTTP de calificación', () => {
  it.each([0, 6, '5'])(
    'rechaza calificación guardada inválida %s',
    async (score) => {
      respond({ item: { score, comment: null } })
      await expect(fetchRating('t1')).rejects.toThrow()
    },
  )
  it('acepta calificación nula y ausencia 404', async () => {
    respond({ item: null })
    expect(await fetchRating('t1')).toBeNull()
    respond({}, 404)
    expect(await fetchTicket('t1')).toBeNull()
    expect(await fetchRating('t1')).toBeNull()
  })
})
