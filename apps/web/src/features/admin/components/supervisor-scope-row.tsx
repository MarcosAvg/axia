import { TrashIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { AdminRow } from '../api/admin-api'
import type { SupervisorScope } from '../domain/access'
import { adminMessages } from '../i18n'

interface SupervisorScopeRowProps {
  scope: SupervisorScope
  userName: string
  teamName: string
  buildings: AdminRow[]
  onRemove: () => void
  onToggleBuilding: (buildingId: string, checked: boolean) => void
}

/** Fila de un ámbito: equipo y edificios cubiertos. */
export function SupervisorScopeRow({
  scope,
  userName,
  teamName,
  buildings,
  onRemove,
  onToggleBuilding,
}: SupervisorScopeRowProps) {
  const { scopes: t } = adminMessages

  return (
    <li className="flex flex-col gap-2 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-medium">{userName}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`${t.remove}: ${userName}`}
          onClick={onRemove}
        >
          <TrashIcon />
        </Button>
      </div>
      <span className="text-xs text-muted-foreground">{teamName}</span>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {buildings.map((building) => {
          const buildingId = String(building.id)
          const checked = scope.buildingIds.includes(buildingId)
          return (
            <label
              key={buildingId}
              className="flex min-h-9 items-center gap-2 text-sm"
            >
              <Checkbox
                checked={checked}
                onCheckedChange={(value) =>
                  onToggleBuilding(buildingId, value === true)
                }
              />
              {String(building.name)}
            </label>
          )
        })}
      </div>
    </li>
  )
}
