import type { Identity } from '@/features/auth'
import type { ActionContext } from './actions'
import type { TicketStatus } from './types'

/** Identidad de prueba con permisos en ámbito `all`. */
export function identityWith(permissions: string[]): Identity {
  return {
    userId: 'u1',
    fullName: 'Prueba',
    phone: null,
    active: true,
    roles: [],
    permissions: permissions.map((permission) => ({
      permission,
      scope: 'all' as const,
    })),
    technicianId: null,
    timezone: 'America/Mexico_City',
    mustChangePassword: false,
  }
}

/** Contexto de acciones con valores neutros y capacidades de validación. */
export function context(
  permissions: string[],
  status: TicketStatus,
  overrides: Partial<ActionContext> = {},
): ActionContext {
  return {
    identity: identityWith(permissions),
    status,
    isRequester: false,
    requesterValidated: false,
    supervisorValidated: false,
    canValidateRequester: permissions.includes('ticket.validate'),
    canValidateSupervisor: permissions.includes('ticket.validate'),
    validationPolicy: 'both',
    isSupervisorRole: false,
    hasTaken: false,
    ...overrides,
  }
}
