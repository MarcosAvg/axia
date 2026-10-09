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
import { adminMessages } from '@/features/admin'

export const Route = createFileRoute('/_authenticated/admin/')({
  component: AdminHome,
})

const cardClass =
  'flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50'

const gridClass = 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3'

type AdminPath =
  | '/admin/roles'
  | '/admin/usuarios'
  | '/admin/ambitos'
  | '/admin/calendarios'
  | '/admin/integraciones'
  | '/admin/configuracion'

function AdminLink({
  to,
  icon: Icon,
  title,
}: {
  to: AdminPath
  icon: LucideIcon
  title: string
}) {
  return (
    <Link to={to} className={cardClass}>
      <Icon className="size-5 text-muted-foreground" />
      <span className="font-medium">{title}</span>
    </Link>
  )
}

function AdminHome() {
  const { nav } = adminMessages
  return (
    <div className={gridClass}>
      <Link
        to="/admin/catalogos"
        search={{ catalog: 'teams' }}
        className={cardClass}
      >
        <LibraryIcon className="size-5 text-muted-foreground" />
        <span className="font-medium">{nav.catalogs}</span>
      </Link>
      <AdminLink to="/admin/roles" icon={ShieldCheckIcon} title={nav.roles} />
      <AdminLink to="/admin/usuarios" icon={UsersIcon} title={nav.users} />
      <AdminLink to="/admin/ambitos" icon={Building2Icon} title={nav.scopes} />
      <AdminLink
        to="/admin/calendarios"
        icon={CalendarDaysIcon}
        title={nav.calendars}
      />
      <AdminLink
        to="/admin/integraciones"
        icon={PlugIcon}
        title={nav.integrations}
      />
      <AdminLink
        to="/admin/configuracion"
        icon={SettingsIcon}
        title={nav.settings}
      />
    </div>
  )
}
