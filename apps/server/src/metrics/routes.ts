import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import {
  authGuards,
  currentActor,
  requirePermission,
  type Guard,
} from '../auth/guards.js'
import type { Actor } from '../auth/authorization.js'
import type { AuthService } from '../auth/service.js'
import type { AppConfig } from '../config.js'
import type { Database } from '../db/client.js'
import {
  byTechnician,
  duplicateAlerts,
  duplicateTickets,
  duplicatesByDimension,
  metricsSummary,
  pausesByReason,
  recentActivity,
  rejectCancel,
  routing,
  satisfaction,
  sla,
  slaByPriority,
  type MetricsFilters,
} from './service.js'

const filterSchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal('')),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal('')),
  buildingId: z.string().uuid().optional().or(z.literal('')),
  teamId: z.string().uuid().optional().or(z.literal('')),
  categoryId: z.string().uuid().optional().or(z.literal('')),
  dependencyId: z.string().uuid().optional().or(z.literal('')),
})

function filtersOf(query: unknown): MetricsFilters {
  const parsed = filterSchema.parse(query)
  return {
    from: parsed.from || undefined,
    to: parsed.to || undefined,
    buildingId: parsed.buildingId || undefined,
    teamId: parsed.teamId || undefined,
    categoryId: parsed.categoryId || undefined,
    dependencyId: parsed.dependencyId || undefined,
  }
}

type MetricRoute = {
  db: Database
  guard: Guard[]
  path: string
  load: (
    db: Database,
    actor: Actor,
    filters: MetricsFilters,
  ) => Promise<unknown>
}

function registerMetric(app: FastifyInstance, route: MetricRoute) {
  app.get(route.path, { preHandler: route.guard }, async (request) => ({
    items: await route.load(
      route.db,
      currentActor(request),
      filtersOf(request.query),
    ),
  }))
}

export function registerMetricsRoutes(
  app: FastifyInstance,
  auth: AuthService,
  config: AppConfig,
  db: Database,
) {
  const ticketView: Guard[] = [
    authGuards(auth, config, false),
    requirePermission('ticket.view'),
  ]
  const metricsView: Guard[] = [
    authGuards(auth, config, false),
    requirePermission('metrics.view'),
  ]

  app.get(
    '/api/metrics/summary',
    { preHandler: ticketView },
    async (request) => {
      const { compact } = z
        .object({ compact: z.coerce.number().int().min(0).max(1).default(0) })
        .parse(request.query)
      return metricsSummary(
        db,
        currentActor(request),
        filtersOf(request.query),
        compact === 1,
      )
    },
  )
  app.get(
    '/api/dashboard/activity',
    { preHandler: ticketView },
    async (request) => {
      const { limit } = z
        .object({ limit: z.coerce.number().int().min(1).max(50).default(8) })
        .parse(request.query)
      return {
        items: await recentActivity(db, currentActor(request), limit),
      }
    },
  )

  for (const [path, load] of [
    ['/api/metrics/pauses', pausesByReason],
    ['/api/metrics/duplicate-tickets', duplicateTickets],
    ['/api/metrics/duplicate-alerts', duplicateAlerts],
    ['/api/metrics/duplicates-by-dimension', duplicatesByDimension],
    ['/api/metrics/satisfaction', satisfaction],
    ['/api/metrics/sla', sla],
    ['/api/metrics/sla-by-priority', slaByPriority],
    ['/api/metrics/by-technician', byTechnician],
    ['/api/metrics/reject-cancel', rejectCancel],
    ['/api/metrics/routing', routing],
  ] as const) {
    registerMetric(app, { db, guard: metricsView, path, load })
  }
}
