import { useState } from 'react'
import { SearchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import type { AdminRow } from '../api/admin-api'
import type { SupervisorScope } from '../domain/access'
import { adminMessages } from '../i18n'
import { EntityDialog } from './entity-dialog'

interface BuildingsListProps {
  options: AdminRow[]
  selectedIds: string[]
  onToggle: (buildingId: string, checked: boolean) => void
}

function BuildingsList({ options, selectedIds, onToggle }: BuildingsListProps) {
  return (
    <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
      {options.map((building) => {
        const id = String(building.id)
        return (
          <label
            key={id}
            className="flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm"
          >
            <Checkbox
              checked={selectedIds.includes(id)}
              onCheckedChange={(value) => onToggle(id, value === true)}
            />
            {String(building.name)}
          </label>
        )
      })}
    </div>
  )
}

interface ScopeBuildingsDialogProps {
  scope: SupervisorScope
  userName: string
  teamName: string
  buildings: AdminRow[]
  onToggle: (buildingId: string, checked: boolean) => void
  onClose: () => void
}

/** Diálogo para marcar los edificios que cubre un ámbito de supervisor. */
export function ScopeBuildingsDialog({
  scope,
  userName,
  teamName,
  buildings,
  onToggle,
  onClose,
}: ScopeBuildingsDialogProps) {
  const [query, setQuery] = useState('')
  const { scopes: t, actions } = adminMessages

  const term = query.trim().toLocaleLowerCase('es-MX')
  const options = term
    ? buildings.filter((building) =>
        String(building.name).toLocaleLowerCase('es-MX').includes(term),
      )
    : buildings

  return (
    <EntityDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={userName}
      description={`${teamName} · ${t.buildingsHelp}`}
    >
      <div className="flex flex-col gap-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={actions.selectPlaceholder}
            aria-label={t.buildings}
            className="pl-9"
          />
        </div>
        <BuildingsList
          options={options}
          selectedIds={scope.buildingIds}
          onToggle={onToggle}
        />
        <footer className="flex justify-end border-t pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            {actions.close}
          </Button>
        </footer>
      </div>
    </EntityDialog>
  )
}
