import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { RequirePermission } from '@/features/auth'
import { adminMessages } from '@/features/admin'

const linkClass =
  'inline-flex min-h-11 items-center px-1 text-sm text-muted-foreground hover:text-foreground [&.active]:font-semibold [&.active]:text-foreground'

export const Route = createFileRoute('/_authenticated/admin')({
  component: AdminLayout,
})

function AdminLayout() {
  return (
    <RequirePermission permission="catalog.manage">
      <div className="flex flex-col gap-6">
        <header>
          <h1 className="text-xl font-semibold">{adminMessages.title}</h1>
          <p className="text-sm text-muted-foreground">
            {adminMessages.subtitle}
          </p>
        </header>
        <nav
          aria-label={adminMessages.nav.label}
          className="flex flex-wrap gap-4"
        >
          <Link
            to="/admin/catalogos"
            search={{ catalog: 'teams' }}
            className={linkClass}
          >
            {adminMessages.nav.catalogs}
          </Link>
          <Link to="/admin/roles" className={linkClass}>
            {adminMessages.nav.roles}
          </Link>
          <Link to="/admin/usuarios" className={linkClass}>
            {adminMessages.nav.users}
          </Link>
          <Link to="/admin/ambitos" className={linkClass}>
            {adminMessages.nav.scopes}
          </Link>
        </nav>
        <Outlet />
      </div>
    </RequirePermission>
  )
}
