import { useState } from 'react'
import { toast } from 'sonner'
import { ErrorAlert, LoadingList } from '@/components/shared/async-state'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { dependencyLocationsMessages } from '../dependency-locations-i18n'
import {
  useAdminRows,
  useDependencyLocationIds,
  useDependencyLocationsSave,
} from '../hooks/use-admin-catalog'
import { adminMessages } from '../i18n'
import { EntityDialog } from './entity-dialog'

const t = dependencyLocationsMessages

interface GroupProps {
  building: Record<string, unknown>
  locations: Record<string, unknown>[]
  selected: string[]
  onToggle: (id: string) => void
}

function LocationGroup({
  building,
  locations,
  selected,
  onToggle,
}: GroupProps) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">{String(building.name ?? '')}</h3>
      {locations.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {locations.map((location) => {
            const id = String(location.id)
            return (
              <div key={id} className="flex min-h-9 items-center gap-2">
                <Checkbox
                  id={`dependency-location-${id}`}
                  checked={selected.includes(id)}
                  onCheckedChange={() => onToggle(id)}
                />
                <label
                  htmlFor={`dependency-location-${id}`}
                  className="text-sm"
                >
                  {String(location.name ?? '')}
                </label>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function LocationsPicker({
  buildings,
  locations,
  selected,
  onToggle,
}: {
  buildings: Record<string, unknown>[]
  locations: Record<string, unknown>[]
  selected: string[]
  onToggle: (id: string) => void
}) {
  return (
    <div className="flex min-h-0 flex-col gap-4 overflow-auto pr-1">
      {buildings.map((building) => (
        <LocationGroup
          key={String(building.id)}
          building={building}
          locations={locations.filter(
            (location) => String(location.building_id) === String(building.id),
          )}
          selected={selected}
          onToggle={onToggle}
        />
      ))}
    </div>
  )
}

function DialogFooter({
  busy,
  onCancel,
  onSave,
}: {
  busy: boolean
  onCancel: () => void
  onSave: () => void
}) {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="outline" onClick={onCancel} disabled={busy}>
        {adminMessages.actions.cancel}
      </Button>
      <Button onClick={onSave} disabled={busy}>
        {busy ? adminMessages.actions.saving : t.save}
      </Button>
    </div>
  )
}

/** Selección de ubicaciones donde se ofrece una dependencia. */
export function DependencyLocationsDialog({
  dependency,
  onClose,
}: {
  dependency: Record<string, unknown>
  onClose: () => void
}) {
  const buildings = useAdminRows('buildings')
  const locations = useAdminRows('locations')
  const current = useDependencyLocationIds(String(dependency.id))
  const save = useDependencyLocationsSave()
  const [chosen, setChosen] = useState<string[] | null>(null)
  const selected = chosen ?? current.data ?? []
  function toggle(locationId: string) {
    setChosen(
      selected.includes(locationId)
        ? selected.filter((item) => item !== locationId)
        : [...selected, locationId],
    )
  }
  function submit() {
    save.mutate(
      { id: String(dependency.id), locationIds: selected },
      {
        onSuccess: () => {
          toast.success(t.saved)
          onClose()
        },
        onError: () => toast.error(t.error),
      },
    )
  }
  return (
    <EntityDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={t.title}
      description={String(dependency.name ?? '')}
    >
      <div className="flex min-h-0 flex-col gap-4">
        <p className="text-sm text-muted-foreground">{t.help}</p>
        {current.isLoading ? <LoadingList rows={3} /> : null}
        {current.isError ? <ErrorAlert message={t.error} /> : null}
        <LocationsPicker
          buildings={buildings.data ?? []}
          locations={locations.data ?? []}
          selected={selected}
          onToggle={toggle}
        />
        <DialogFooter
          busy={save.isPending}
          onCancel={onClose}
          onSave={submit}
        />
      </div>
    </EntityDialog>
  )
}
