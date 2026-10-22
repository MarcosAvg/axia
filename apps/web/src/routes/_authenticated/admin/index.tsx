import { createFileRoute, Link } from '@tanstack/react-router'
import { cn } from 'cn'
import type { LucideIcon } from 'lucide-react'
import {
  Building2Icon,
  CalendarDaysIcon,
  LibraryIcon,
  PlugIcon,
  SettingsIcon,
  ShieldCheckIcon,
  UsersIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { adminMessages } from '@/features/admin'
import { can, useAuth } from '@/features/auth'

export const Route = createFileRoute('/_authenticated/admin/')({
  component: AdminHome,
})

type AdminPath =
  | '/admin/roles'
  | '/admin/usuarios'
  | '/admin/ambitos'
  | '/admin/calendarios'
  | '/admin/integraciones'
  | '/admin/configuracion'

interface AdminEntry {
  icon: LucideIcon
  title: string
  description: string
  to: AdminPath | '/admin/catalogos'
  permission: string
  search?: { catalog: string }
  disabled?: boolean
}

const { nav, descriptions } = adminMessages

const GROUP_GRID = {
  3: 'sm:grid-cols-2 xl:grid-cols-3',
  4: 'sm:grid-cols-2 xl:grid-cols-4',
} as const

const groups: { label: string; columns: 3 | 4; items: AdminEntry[] }[] = [
  {
    label: 'Catálogos y operación',
    columns: 4,
    items: [
      {
        icon: LibraryIcon,
        title: nav.catalogs,
        description: descriptions.catalogs,
        to: '/admin/catalogos',
        permission: 'catalog.manage',
        search: { catalog: 'teams' },
      },
      {
        icon: CalendarDaysIcon,
        title: nav.calendars,
        description: descriptions.calendars,
        to: '/admin/calendarios',
        permission: 'catalog.manage',
      },
      {
        icon: PlugIcon,
        title: nav.integrations,
        description: descriptions.integrations,
        to: '/admin/integraciones',
        permission: 'catalog.manage',
        disabled: true,
      },
      {
        icon: SettingsIcon,
        title: nav.settings,
        description: descriptions.settings,
        to: '/admin/configuracion',
        permission: 'catalog.manage',
      },
    ],
  },
  {
    label: 'Acceso',
    columns: 3,
    items: [
      {
        icon: ShieldCheckIcon,
        title: nav.roles,
        description: descriptions.roles,
        to: '/admin/roles',
        permission: 'role.manage',
      },
      {
        icon: UsersIcon,
        title: nav.users,
        description: descriptions.users,
        to: '/admin/usuarios',
        permission: 'user.manage',
      },
      {
        icon: Building2Icon,
        title: nav.scopes,
        description: descriptions.scopes,
        to: '/admin/ambitos',
        permission: 'assignment.manage',
      },
    ],
  },
]

function AdminCard({ entry }: { entry: AdminEntry }) {
  const Icon = entry.icon
  const content = (
    <>
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2 font-medium">
          {entry.title}
          {entry.disabled ? (
            <Badge variant="outline">No disponible</Badge>
          ) : null}
        </span>
        <span className="text-sm text-muted-foreground">
          {entry.description}
        </span>
      </span>
    </>
  )

  if (entry.disabled) {
    return (
      <div
        aria-disabled="true"
        className="flex items-start gap-3 rounded-xl border bg-card p-4 opacity-70"
      >
        {content}
      </div>
    )
  }

  return (
    <Link
      to={entry.to}
      search={entry.search}
      className="flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50"
    >
      {content}
    </Link>
  )
}

function AdminHome() {
  const { identity } = useAuth()
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((entry) => can(identity, entry.permission)),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={adminMessages.title}
        description={adminMessages.subtitle}
      />
      {visibleGroups.map((group) => (
        <section key={group.label} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            {group.label}
          </h2>
          <div className={cn('grid gap-3', GROUP_GRID[group.columns])}>
            {group.items.map((entry) => (
              <AdminCard key={entry.to} entry={entry} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
