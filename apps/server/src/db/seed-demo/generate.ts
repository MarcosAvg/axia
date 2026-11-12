import { DEFAULT_TIMES, DEMO_TICKETS, type DemoTicket } from './data.js'
import {
  CATEGORIES,
  CHANNELS,
  OLD_STATUSES,
  PRIORITIES,
  REQUESTERS,
  SERVICE_TYPES,
  generatedId,
  statusList,
} from './generate-catalog.js'
import { applyScenarios, type ScenarioState } from './generate-scenarios.js'
import { baselineTimes, reportedHoursAgo } from './generate-times.js'
import { mulberry32, weighted, type Rng } from './random.js'

type Category = (typeof CATEGORIES)[number]

function dependencyFor(requester: string) {
  return requester === 'ana' || requester === 'carla' || requester === 'elena'
    ? 'Sistemas'
    : 'Recursos Humanos'
}

function buildTicket(input: {
  index: number
  status: DemoTicket['status']
  rnd: Rng
  now: Date
  oldIndex: number
  staleIndex: number
}): { ticket: DemoTicket; category: Category } {
  const { index, status, rnd, now, oldIndex, staleIndex } = input
  const requester = REQUESTERS[index % REQUESTERS.length] as string
  const category = weighted(
    rnd,
    CATEGORIES.map((entry) => [entry, entry.weight] as const),
  )
  const building = rnd() < 0.58 ? 'Edificio Central' : 'Edificio Norte'
  const location = rnd() < 0.55 ? 'Planta baja' : 'Piso 1'
  const priority = weighted(rnd, PRIORITIES)
  const times = baselineTimes(rnd, priority, status)
  const technician = weighted(
    rnd,
    category.technicians.map((entry) => [entry, 1] as const),
  )
  return {
    category,
    ticket: {
      id: generatedId(index),
      status,
      category: category.category,
      subcategory: category.subcategory,
      problem: category.problem,
      serviceType: weighted(rnd, SERVICE_TYPES),
      priority,
      channel: weighted(rnd, CHANNELS),
      building,
      location,
      dependency: dependencyFor(requester),
      requester: requester as DemoTicket['requester'],
      description: `${category.problem} en ${building}, ${location}`,
      reportedHoursAgo: reportedHoursAgo({
        rnd,
        now,
        status,
        oldIndex,
        staleIndex,
      }),
      technician,
      evidence: false,
      times: { ...DEFAULT_TIMES, ...times },
    },
  }
}

function scenarioState(): ScenarioState {
  return {
    reopenCount: 0,
    recaptureCount: 0,
    reassignmentCount: 0,
    supervisorReassignmentCount: 0,
    auxiliaryCount: 0,
    evidenceCount: 0,
    ratingCount: 0,
    candidateCount: 0,
  }
}

function isStaleCandidate(status: DemoTicket['status']) {
  return ['registered', 'with_supervisor', 'assigned'].includes(status)
}

/** Conjunto determinista que llena el tablero sin tocar los seis escenarios curados. */
export function buildGeneratedTickets(): DemoTicket[] {
  const rnd = mulberry32(0x5eed_2026)
  const now = new Date()
  const tickets: DemoTicket[] = []
  const linkableIds = DEMO_TICKETS.slice(0, 4).map((ticket) => ticket.id)
  const state = scenarioState()
  let oldIndex = 0
  let staleIndex = 0

  statusList(rnd).forEach((status, index) => {
    const built = buildTicket({ index, status, rnd, now, oldIndex, staleIndex })
    const { ticket, category } = built
    if (OLD_STATUSES.includes(status)) oldIndex += 1
    if (isStaleCandidate(status)) staleIndex += 1
    applyScenarios({ ticket, rnd, state, index, linkableIds, category })
    if (status !== 'duplicate') linkableIds.push(ticket.id)
    tickets.push(ticket)
  })
  return tickets
}
