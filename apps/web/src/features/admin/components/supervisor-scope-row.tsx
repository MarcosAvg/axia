import { Button } from '@/components/ui/button'
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
          className="min-h-11"
          onClick={onRemove}
        >
          {t.remove}
        </Button>
      </div>
      <span className="text-xs text-muted-foreground">{teamName}</span>
      <div className="flex flex-wrap gap-3">
        {buildings.map((building) => {
          const buildingId = String(building.id)
          const checked = scope.buildingIds.includes(buildingId)
          return (
            <label key={buildingId} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4"
                checked={checked}
                onChange={(event) =>
                  onToggleBuilding(buildingId, event.target.checked)
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
