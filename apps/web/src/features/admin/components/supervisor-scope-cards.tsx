import { Building2Icon, TrashIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SupervisorScope } from '../domain/access'
import { adminMessages } from '../i18n'

export interface ScopeLabels {
  supervisor: (id: string) => string
  team: (id: string) => string
  buildings: (ids: string[]) => string[]
  onEdit: (scope: SupervisorScope) => void
  onRemove: (scope: SupervisorScope) => void
}

export function ScopeActions({
  name,
  onEditBuildings,
  onRemove,
}: {
  name: string
  onEditBuildings: () => void
  onRemove: () => void
}) {
  const { scopes: t } = adminMessages
  return (
    <div className="flex justify-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="size-11 lg:size-7"
        aria-label={`${t.editBuildings}: ${name}`}
        onClick={onEditBuildings}
      >
        <Building2Icon />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="size-11 lg:size-7"
        aria-label={`${t.remove}: ${name}`}
        onClick={onRemove}
      >
        <TrashIcon />
      </Button>
    </div>
  )
}

export function ScopeCards({
  scopes,
  labels,
}: {
  scopes: SupervisorScope[]
  labels: ScopeLabels
}) {
  const { scopes: t } = adminMessages
  return (
    <ul className="flex flex-col gap-2 lg:hidden">
      {scopes.map((scope) => {
        const name = labels.supervisor(scope.userId)
        const buildingNames = labels.buildings(scope.buildingIds)
        return (
          <li
            key={scope.id}
            className="flex flex-col gap-3 rounded-xl border bg-card p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words font-medium">{name}</p>
                <p className="text-xs text-muted-foreground">
                  {labels.team(scope.teamId)}
                </p>
              </div>
              <ScopeActions
                name={name}
                onEditBuildings={() => labels.onEdit(scope)}
                onRemove={() => labels.onRemove(scope)}
              />
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">{t.buildings}: </span>
              {buildingNames.length === 0 ? '—' : buildingNames.join(' · ')}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
