import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import type { NavItem } from './nav-items'

interface NavDestinationProps {
  item: NavItem
  className?: string
  onNavigate?: () => void
  children: ReactNode
}

/** Enlace de un destino de navegación, resuelto según el tipo de ruta. */
export function NavDestination({
  item,
  className,
  onNavigate,
  children,
}: NavDestinationProps) {
  const shared = {
    className,
    onClick: onNavigate,
  }

  if (item.kind === 'tickets') {
    return (
      <Link to="/tickets" search={{ page: 1 }} {...shared}>
        {children}
      </Link>
    )
  }
  if (item.kind === 'catalog') {
    return (
      <Link to="/admin/catalogos" search={{ catalog: 'teams' }} {...shared}>
        {children}
      </Link>
    )
  }
  return (
    <Link to={item.to} {...shared}>
      {children}
    </Link>
  )
}
