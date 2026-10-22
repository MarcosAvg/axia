import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronRightIcon } from 'lucide-react'
import { shellMessages } from '../i18n'

interface Crumb {
  label: string
  to?: '/admin' | '/tickets'
}

const sectionLabels: Record<string, string> = {
  tickets: shellMessages.nav.tickets,
  'mi-trabajo': shellMessages.nav.myWork,
  inbox: shellMessages.nav.inbox,
  avisos: shellMessages.nav.notifications,
  metricas: shellMessages.nav.metrics,
  perfil: shellMessages.nav.profile,
  admin: shellMessages.groups.administration,
}

const adminLabels: Record<string, string> = {
  catalogos: shellMessages.nav.catalogs,
  roles: shellMessages.nav.roles,
  usuarios: shellMessages.nav.users,
  ambitos: shellMessages.nav.scopes,
  calendarios: shellMessages.nav.calendars,
  integraciones: shellMessages.nav.integrations,
  configuracion: shellMessages.nav.settings,
}

/** Migas de pan a partir de la ruta actual. */
function buildCrumbs(pathname: string): Crumb[] {
  if (pathname === '/') return [{ label: shellMessages.nav.panel }]

  const segments = pathname.split('/').filter(Boolean)
  const [first] = segments
  if (!first) return []

  const crumbs: Crumb[] = []
  const section = sectionLabels[first]

  if (first === 'admin') {
    crumbs.push({ label: shellMessages.groups.administration, to: '/admin' })
    const [, child] = segments
    if (child) {
      crumbs.push({ label: adminLabels[child] ?? child })
    }
    return crumbs
  }

  if (first === 'tickets') {
    crumbs.push({ label: shellMessages.nav.tickets, to: '/tickets' })
    const [, child] = segments
    if (child === 'nuevo') crumbs.push({ label: 'Nuevo tiquet' })
    else if (child) crumbs.push({ label: 'Detalle' })
    return crumbs
  }

  crumbs.push({ label: section ?? first })
  return crumbs
}

/** Migas de pan de la ruta activa. */
export function AppBreadcrumbs() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const crumbs = buildCrumbs(pathname)

  return (
    <nav aria-label="Ruta" className="hidden min-w-0 md:block">
      <ol className="flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1
          return (
            <li
              key={`${crumb.label}-${index}`}
              className="flex items-center gap-1.5"
            >
              {index > 0 ? (
                <ChevronRightIcon className="size-3.5 text-muted-foreground" />
              ) : null}
              {crumb.to && !isLast ? (
                <Link
                  to={crumb.to}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="truncate font-medium text-foreground">
                  {crumb.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
