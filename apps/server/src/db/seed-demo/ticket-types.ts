import type { RequesterKey, TechnicianKey } from './people-data.js'

export type DemoTicketStatus =
  | 'registered'
  | 'with_supervisor'
  | 'assigned'
  | 'in_progress'
  | 'paused'
  | 'attended'
  | 'under_claim'
  | 'closed'
  | 'rejected'
  | 'cancelled'
  | 'duplicate'

export type DemoTicketTimes = {
  takenAfterHours: number
  assignedAfterHours: number
  startedAfterHours: number
  attendedAfterHours: number
  validatedAfterHours: number
}

export const DEFAULT_TIMES: DemoTicketTimes = {
  takenAfterHours: 0.5,
  assignedAfterHours: 1,
  startedAfterHours: 2,
  attendedAfterHours: 24,
  validatedAfterHours: 48,
}

export type DemoPauseSpec = {
  openedAfterHours: number
  advanceAfterHours: number
  closedAfterHours?: number
  root: string
  substate: string
  exit?: string
}

type DemoReopenSpec = {
  claimAfterHours: number
  resolveAfterHours: number
  startedAfterHours: number
  attendedAfterHours: number
  validatedAfterHours: number
  technician?: TechnicianKey
  claimReason: string
  description: string
}

export type DemoTicket = {
  id: string
  status: DemoTicketStatus
  category: string
  subcategory: string
  problem: string
  serviceType: string
  priority: string
  channel: string
  building: string
  location: string
  dependency: string
  requester: RequesterKey
  description: string
  reportedHoursAgo: number
  technician?: TechnicianKey
  auxiliary?: TechnicianKey
  leaderParticipation?: 'leader' | 'auxiliary'
  times?: Partial<DemoTicketTimes>
  evidence?: boolean
  discardedFrom?: DemoTicketStatus
  discardAfterHours?: number
  discardReason?: string
  duplicateOf?: string
  duplicateCandidateOf?: string
  duplicateCandidateDecision?: 'ignored' | 'dismissed' | 'linked' | null
  pauses?: DemoPauseSpec[]
  reopen?: DemoReopenSpec
  recapture?: { afterHours: number; reason: string }
  reassignment?: {
    afterHours: number
    technician: TechnicianKey
    reason: string
  }
  supervisorReassignment?: { afterHours: number; reason: string }
  rating?: number
  ratingAfterHours?: number
  claimAfterHours?: number
  claimReason?: string
  claimDescription?: string
}
