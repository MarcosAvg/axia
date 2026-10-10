import { createFileRoute, Link } from '@tanstack/react-router'
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
import { adminMessages } from '@/features/admin'

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
  search?: { catalog: string }
}

const { nav, descriptions } = adminMessages

const groups: { label: string; items: AdminEntry[] }[] = [
  {
    label: 'Catálogos y operación',
    items: [
      {
        icon: LibraryIcon,
        title: nav.catalogs,
        description: descriptions.catalogs,
        to: '/admin/catalogos',
        search: { catalog: 'teams' },
      },
      {
        icon: CalendarDaysIcon,
        title: nav.calendars,
        description: descriptions.calendars,
        to: '/admin/calendarios',
      },
      {
        icon: PlugIcon,
        title: nav.integrations,
        description: descriptions.integrations,
        to: '/admin/integraciones',
      },
      {
        icon: SettingsIcon,
        title: nav.settings,
        description: descriptions.settings,
        to: '/admin/configuracion',
      },
    ],
  },
  {
    label: 'Acceso',
    items: [
      {
        icon: ShieldCheckIcon,
        title: nav.roles,
        description: descriptions.roles,
        to: '/admin/roles',
      },
      {
        icon: UsersIcon,
        title: nav.users,
        description: descriptions.users,
        to: '/admin/usuarios',
      },
      {
        icon: Building2Icon,
        title: nav.scopes,
        description: descriptions.scopes,
        to: '/admin/ambitos',
      },
    ],
  },
]

function AdminCard({ entry }: { entry: AdminEntry }) {
  const Icon = entry.icon
  return (
    <Link
      to={entry.to}
      search={entry.search}
      className="flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50"
    >
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-medium">{entry.title}</span>
        <span className="text-sm text-muted-foreground">
          {entry.description}
        </span>
      </span>
    </Link>
  )
}

function AdminHome() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={adminMessages.title}
        description={adminMessages.subtitle}
      />
      {groups.map((group) => (
        <section key={group.label} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            {group.label}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((entry) => (
              <AdminCard key={entry.to} entry={entry} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
