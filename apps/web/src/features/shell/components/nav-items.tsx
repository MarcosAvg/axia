import type { LucideIcon } from 'lucide-react'
import {
  BarChart3Icon,
  Building2Icon,
  CalendarDaysIcon,
  HardHatIcon,
  InboxIcon,
  LayoutDashboardIcon,
  LibraryIcon,
  SettingsIcon,
  ShieldCheckIcon,
  TicketIcon,
  UserIcon,
  UsersIcon,
} from 'lucide-react'
import { can } from '@/features/auth'
import type { Identity } from '@/features/auth'
import { shellMessages } from '../i18n'

/** Rutas simples del armazón (sin parámetros de búsqueda obligatorios). */
type PlainPath =
  | '/'
  | '/mi-trabajo'
  | '/inbox'
  | '/metricas'
  | '/perfil'
  | '/admin/roles'
  | '/admin/usuarios'
  | '/admin/ambitos'
  | '/admin/calendarios'
  | '/admin/configuracion'

interface NavItemBase {
  id: string
  label: string
  icon: LucideIcon
  permission?: string
  visible?: (identity: Identity | null) => boolean
}

/**
 * Un destino de navegación. La mayoría son rutas simples; los que exigen
 * parámetros de búsqueda obligatorios (`/tickets`, `/admin/catalogos`) se
 * identifican con `kind` para construirlos con sus parámetros.
 */
export type NavItem =
  | (NavItemBase & { kind: 'plain'; to: PlainPath })
  | (NavItemBase & { kind: 'tickets' })
  | (NavItemBase & { kind: 'catalog' })

export interface NavSection {
  id: string
  label: string
  items: NavItem[]
}

const { nav } = shellMessages

/** Aplica el permiso y la condición de perfil de cada destino. */
export function isNavItemVisible(
  item: NavItem,
  identity: Identity | null,
): boolean {
  if (item.permission && !can(identity, item.permission)) return false
  return item.visible ? item.visible(identity) : true
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'operation',
    label: shellMessages.groups.operation,
    items: [
      {
        id: 'panel',
        kind: 'plain',
        to: '/',
        label: nav.panel,
        icon: LayoutDashboardIcon,
      },
      {
        id: 'tickets',
        kind: 'tickets',
        label: nav.tickets,
        icon: TicketIcon,
        permission: 'ticket.view',
      },
      {
        id: 'my-work',
        kind: 'plain',
        to: '/mi-trabajo',
        label: nav.myWork,
        icon: HardHatIcon,
        permission: 'ticket.view',
        visible: (identity) => Boolean(identity?.technicianId),
      },
      {
        id: 'inbox',
        kind: 'plain',
        to: '/inbox',
        label: nav.inbox,
        icon: InboxIcon,
        permission: 'ticket.view',
        visible: (identity) => can(identity, 'ticket.take_offer'),
      },
    ],
  },
  {
    id: 'analytics',
    label: shellMessages.groups.analytics,
    items: [
      {
        id: 'metrics',
        kind: 'plain',
        to: '/metricas',
        label: nav.metrics,
        icon: BarChart3Icon,
        permission: 'metrics.view',
      },
    ],
  },
  {
    id: 'administration',
    label: shellMessages.groups.administration,
    items: [
      {
        id: 'catalogs',
        kind: 'catalog',
        label: nav.catalogs,
        icon: LibraryIcon,
        permission: 'catalog.manage',
      },
      {
        id: 'roles',
        kind: 'plain',
        to: '/admin/roles',
        label: nav.roles,
        icon: ShieldCheckIcon,
        permission: 'role.manage',
      },
      {
        id: 'users',
        kind: 'plain',
        to: '/admin/usuarios',
        label: nav.users,
        icon: UsersIcon,
        permission: 'user.manage',
      },
      {
        id: 'scopes',
        kind: 'plain',
        to: '/admin/ambitos',
        label: nav.scopes,
        icon: Building2Icon,
        permission: 'assignment.manage',
      },
      {
        id: 'calendars',
        kind: 'plain',
        to: '/admin/calendarios',
        label: nav.calendars,
        icon: CalendarDaysIcon,
        permission: 'catalog.manage',
      },
      {
        id: 'settings',
        kind: 'plain',
        to: '/admin/configuracion',
        label: nav.settings,
        icon: SettingsIcon,
        permission: 'catalog.manage',
      },
    ],
  },
  {
    id: 'account',
    label: shellMessages.groups.account,
    items: [
      {
        id: 'profile',
        kind: 'plain',
        to: '/perfil',
        label: nav.profile,
        icon: UserIcon,
      },
    ],
  },
]
