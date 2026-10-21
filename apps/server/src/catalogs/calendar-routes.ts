import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { authGuards, requirePermission, type Guard } from '../auth/guards.js'
import type { AuthService } from '../auth/service.js'
import type { AppConfig } from '../config.js'
import type { Database } from '../db/client.js'
import {
  addHoliday,
  addInterval,
  createCalendar,
  listCalendars,
  removeHoliday,
  removeInterval,
  updateCalendar,
} from './calendars.js'

const idParams = z.object({ id: z.string().uuid() })
const calendarBody = z.object({
  name: z.string().trim().min(1).max(120),
  timezone: z.string().trim().min(1).max(80),
  active: z.boolean(),
})
const intervalBody = z.object({
  weekday: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
})
const holidayBody = z.object({
  holiday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().trim().max(120).nullable(),
})

function registerCalendarCrud(
  app: FastifyInstance,
  db: Database,
  guard: Guard[],
) {
  app.get('/api/admin/calendars', { preHandler: guard }, async () => ({
    items: await listCalendars(db),
  }))
  app.post(
    '/api/admin/calendars',
    { preHandler: guard },
    async (request, reply) => {
      await createCalendar(db, calendarBody.parse(request.body))
      return reply.status(204).send()
    },
  )
  app.patch(
    '/api/admin/calendars/:id',
    { preHandler: guard },
    async (request, reply) => {
      const { id } = idParams.parse(request.params)
      await updateCalendar(db, id, calendarBody.parse(request.body))
      return reply.status(204).send()
    },
  )
}

function registerCalendarChildren(
  app: FastifyInstance,
  db: Database,
  guard: Guard[],
) {
  app.post(
    '/api/admin/calendars/:id/intervals',
    { preHandler: guard },
    async (request, reply) => {
      const { id } = idParams.parse(request.params)
      await addInterval(db, id, intervalBody.parse(request.body))
      return reply.status(204).send()
    },
  )
  app.delete(
    '/api/admin/calendar-intervals/:id',
    { preHandler: guard },
    async (request, reply) => {
      const { id } = idParams.parse(request.params)
      await removeInterval(db, id)
      return reply.status(204).send()
    },
  )
  app.post(
    '/api/admin/calendars/:id/holidays',
    { preHandler: guard },
    async (request, reply) => {
      const { id } = idParams.parse(request.params)
      const body = holidayBody.parse(request.body)
      await addHoliday(db, id, body.holiday, body.name)
      return reply.status(204).send()
    },
  )
  app.delete(
    '/api/admin/calendar-holidays/:id',
    { preHandler: guard },
    async (request, reply) => {
      const { id } = idParams.parse(request.params)
      await removeHoliday(db, id)
      return reply.status(204).send()
    },
  )
}

export function registerAdminCalendarRoutes(
  app: FastifyInstance,
  auth: AuthService,
  config: AppConfig,
  db: Database,
) {
  const guard: Guard[] = [
    authGuards(auth, config, false),
    requirePermission('catalog.manage'),
  ]
  registerCalendarCrud(app, db, guard)
  registerCalendarChildren(app, db, guard)
}
