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
import { can, canAny } from '@/features/auth'
import type { Identity } from '@/features/auth'
import { shellMessages } from '../i18n'

/** Rutas simples del armazón (sin parámetros de búsqueda obligatorios). */
type PlainPath =
  | '/'
  | '/mi-trabajo'
  | '/inbox'
  | '/metricas'
  | '/perfil'
  | '/admin'
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
  /** Solo aparece en el menú móvil. */
  mobileOnly?: boolean
  /** Se oculta del menú móvil; sigue disponible en escritorio y en la búsqueda. */
  mobileHidden?: boolean
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

const ADMIN_PERMISSIONS = [
  'catalog.manage',
  'user.manage',
  'role.manage',
  'assignment.manage',
]

/** Aplica el permiso, la condición de perfil y el corte de cada menú. */
export function isNavItemVisible(
  item: NavItem,
  identity: Identity | null,
  mobile = false,
): boolean {
  if (mobile && item.mobileHidden) return false
  if (!mobile && item.mobileOnly) return false
  if (item.permission && !can(identity, item.permission)) return false
  return item.visible ? item.visible(identity) : true
}

/** Destinos de la barra inferior, en orden de preferencia; se toman los tres visibles. */
const MOBILE_TAB_IDS = ['panel', 'tickets', 'my-work', 'metrics', 'inbox']

export function mobileTabs(identity: Identity | null): NavItem[] {
  return MOBILE_TAB_IDS.flatMap((id) => {
    const item = NAV_SECTIONS.flatMap((section) => section.items).find(
      (candidate) => candidate.id === id,
    )
    return item && isNavItemVisible(item, identity, true) ? [item] : []
  }).slice(0, 3)
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
        id: 'admin',
        kind: 'plain',
        to: '/admin',
        label: nav.adminHome,
        icon: ShieldCheckIcon,
        visible: (identity) => canAny(identity, ADMIN_PERMISSIONS),
        mobileOnly: true,
      },
      {
        id: 'catalogs',
        kind: 'catalog',
        label: nav.catalogs,
        icon: LibraryIcon,
        permission: 'catalog.manage',
        mobileHidden: true,
      },
      {
        id: 'roles',
        kind: 'plain',
        to: '/admin/roles',
        label: nav.roles,
        icon: ShieldCheckIcon,
        permission: 'role.manage',
        mobileHidden: true,
      },
      {
        id: 'users',
        kind: 'plain',
        to: '/admin/usuarios',
        label: nav.users,
        icon: UsersIcon,
        permission: 'user.manage',
        mobileHidden: true,
      },
      {
        id: 'scopes',
        kind: 'plain',
        to: '/admin/ambitos',
        label: nav.scopes,
        icon: Building2Icon,
        permission: 'assignment.manage',
        mobileHidden: true,
      },
      {
        id: 'calendars',
        kind: 'plain',
        to: '/admin/calendarios',
        label: nav.calendars,
        icon: CalendarDaysIcon,
        permission: 'catalog.manage',
        mobileHidden: true,
      },
      {
        id: 'settings',
        kind: 'plain',
        to: '/admin/configuracion',
        label: nav.settings,
        icon: SettingsIcon,
        permission: 'catalog.manage',
        mobileHidden: true,
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
