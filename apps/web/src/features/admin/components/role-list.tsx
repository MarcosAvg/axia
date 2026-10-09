import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Role } from '../domain/access'
import { adminMessages } from '../i18n'

interface RoleListProps {
  roles: Role[]
  selectedId: string | null
  onSelect: (id: string) => void
}

/** Lista vertical de roles para el master-detail. */
export function RoleList({ roles, selectedId, onSelect }: RoleListProps) {
  return (
    <ul className="flex flex-col gap-1">
      {roles.map((role) => (
        <li key={role.id}>
          <Button
            type="button"
            variant={role.id === selectedId ? 'secondary' : 'ghost'}
            className="min-h-11 w-full justify-start gap-2"
            onClick={() => onSelect(role.id)}
          >
            <span className="truncate">{role.label}</span>
            {!role.active ? (
              <Badge variant="outline" className="ml-auto">
                {adminMessages.list.inactive}
              </Badge>
            ) : null}
          </Button>
        </li>
      ))}
    </ul>
  )
}
