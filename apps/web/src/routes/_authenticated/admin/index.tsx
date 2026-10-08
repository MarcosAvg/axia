import { createFileRoute, Link } from '@tanstack/react-router'
import { adminMessages } from '@/features/admin'

export const Route = createFileRoute('/_authenticated/admin/')({
  component: AdminHome,
})

function AdminHome() {
  return (
    <ul className="flex flex-col gap-2 text-sm">
      <li>
        <Link
          to="/admin/catalogos"
          search={{ catalog: 'teams' }}
          className="underline"
        >
          {adminMessages.nav.catalogs}
        </Link>
      </li>
      <li>
        <Link to="/admin/roles" className="underline">
          {adminMessages.nav.roles}
        </Link>
      </li>
      <li>
        <Link to="/admin/usuarios" className="underline">
          {adminMessages.nav.users}
        </Link>
      </li>
      <li>
        <Link to="/admin/ambitos" className="underline">
          {adminMessages.nav.scopes}
        </Link>
      </li>
    </ul>
  )
}
