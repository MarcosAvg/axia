import { Link } from '@tanstack/react-router'
import type { ComponentPropsWithRef } from 'react'
import type { NavItem } from './nav-items'

interface NavDestinationProps extends Omit<ComponentPropsWithRef<'a'>, 'href'> {
  item: NavItem
}

/** Enlace de un destino de navegación, resuelto según el tipo de ruta. */
export function NavDestination({ item, ...props }: NavDestinationProps) {
  if (item.kind === 'tickets') {
    return <Link to="/tickets" search={{ page: 1 }} {...props} />
  }
  if (item.kind === 'catalog') {
    return (
      <Link to="/admin/catalogos" search={{ catalog: 'teams' }} {...props} />
    )
  }
  return <Link to={item.to} {...props} />
}
