import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Role } from '../domain/access'

interface RoleTabsProps {
  roles: Role[]
  selectedId: string | null
  onSelect: (id: string) => void
}

/** Pestañas para elegir el rol a editar. */
export function RoleTabs({ roles, selectedId, onSelect }: RoleTabsProps) {
  if (roles.length === 0) return null
  return (
    <Tabs value={selectedId ?? undefined} onValueChange={onSelect}>
      <TabsList className="h-auto flex-wrap">
        {roles.map((role) => (
          <TabsTrigger key={role.id} value={role.id} className="min-h-9">
            {role.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
