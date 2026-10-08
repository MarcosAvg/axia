import { cn } from 'cn'
import type { Role } from '../domain/access'

interface RoleTabsProps {
  roles: Role[]
  selectedId: string | null
  onSelect: (id: string) => void
}

/** Pestañas para elegir el rol a editar. */
export function RoleTabs({ roles, selectedId, onSelect }: RoleTabsProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {roles.map((role) => (
        <button
          key={role.id}
          type="button"
          onClick={() => onSelect(role.id)}
          className={cn(
            'inline-flex min-h-11 items-center rounded-full px-3 text-sm',
            role.id === selectedId
              ? 'bg-muted font-medium text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {role.label}
        </button>
      ))}
    </div>
  )
}
