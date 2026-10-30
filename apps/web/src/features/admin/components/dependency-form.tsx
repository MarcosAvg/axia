import { useState } from 'react'
import type { FormEvent } from 'react'
import { toast } from 'sonner'
import { ErrorAlert, LoadingList } from '@/components/shared/async-state'
import { TextField } from '@/components/shared/form-fields'
import { Checkbox } from '@/components/ui/checkbox'
import { dependencyFormMessages as t } from '../dependency-form-i18n'
import {
  useAdminRows,
  useDependencyLocationIds,
  useDependencySave,
} from '../hooks/use-admin-catalog'
import { EntityDialog } from './entity-dialog'
import { EntityForm } from './entity-form'

type Row = Record<string, unknown>
type Invalid = 'name' | 'locations' | null

interface GroupProps {
  building: Row
  locations: Row[]
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
  buildings: Row[]
  locations: Row[]
  selected: string[]
  onToggle: (id: string) => void
}) {
  return (
    <div className="flex flex-col gap-4">
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

interface FieldsProps {
  name: string
  active: boolean
  selected: string[]
  invalid: Invalid
  buildings: Row[]
  locations: Row[]
  loading: boolean
  hasError: boolean
  onName: (value: string) => void
  onActive: (value: boolean) => void
  onToggle: (id: string) => void
}

function DependencyFields({
  name,
  active,
  selected,
  invalid,
  buildings,
  locations,
  loading,
  hasError,
  onName,
  onActive,
  onToggle,
}: FieldsProps) {
  return (
    <>
      <TextField
        id="dependency-name"
        label={t.name}
        value={name}
        error={invalid === 'name' ? t.missingName : undefined}
        onChange={(event) => onName(event.target.value)}
      />
      <div className="flex min-h-11 items-center gap-2">
        <Checkbox
          id="dependency-active"
          checked={active}
          onCheckedChange={(checked) => onActive(checked === true)}
        />
        <label htmlFor="dependency-active" className="text-sm">
          {t.active}
        </label>
      </div>
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-medium">{t.locations}</h3>
          <p className="text-sm text-muted-foreground">{t.locationsHelp}</p>
        </div>
        {loading ? <LoadingList rows={3} /> : null}
        {hasError ? <ErrorAlert message={t.error} /> : null}
        <LocationsPicker
          buildings={buildings}
          locations={locations}
          selected={selected}
          onToggle={onToggle}
        />
        {invalid === 'locations' ? (
          <p role="alert" className="text-sm text-destructive">
            {t.missingLocations}
          </p>
        ) : null}
      </div>
    </>
  )
}

function useDependencyForm(
  dependency: Row | undefined,
  loaded: string[] | undefined,
  onSaved: () => void,
) {
  const id = dependency ? String(dependency.id) : undefined
  const save = useDependencySave()
  const [name, setName] = useState(String(dependency?.name ?? ''))
  const [active, setActive] = useState(dependency?.active !== false)
  const [chosen, setChosen] = useState<string[] | null>(null)
  const [invalid, setInvalid] = useState<Invalid>(null)
  const selected = chosen ?? loaded ?? []

  function toggle(locationId: string) {
    setChosen(
      selected.includes(locationId)
        ? selected.filter((item) => item !== locationId)
        : [...selected, locationId],
    )
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setInvalid('name')
      return
    }
    if (selected.length === 0) {
      setInvalid('locations')
      return
    }
    setInvalid(null)
    save.mutate(
      { id, values: { name: name.trim(), active, locationIds: selected } },
      {
        onSuccess: () => {
          toast.success(t.saved)
          onSaved()
        },
        onError: () => toast.error(t.error),
      },
    )
  }

  return {
    name,
    setName,
    active,
    setActive,
    selected,
    invalid,
    toggle,
    submit,
    saving: save.isPending,
  }
}

/** Alta/edición de una dependencia con sus ubicaciones (una o varias). */
export function DependencyFormDialog({
  dependency,
  onClose,
}: {
  dependency?: Row
  onClose: () => void
}) {
  const id = dependency ? String(dependency.id) : undefined
  const buildings = useAdminRows('buildings')
  const locations = useAdminRows('locations')
  const current = useDependencyLocationIds(id ?? '')
  const form = useDependencyForm(dependency, current.data, onClose)

  return (
    <EntityDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={dependency ? t.editTitle : t.newTitle}
      description={t.help}
    >
      <EntityForm
        onSubmit={form.submit}
        onCancel={onClose}
        isSaving={form.saving}
      >
        <DependencyFields
          name={form.name}
          active={form.active}
          selected={form.selected}
          invalid={form.invalid}
          buildings={buildings.data ?? []}
          locations={locations.data ?? []}
          loading={current.isLoading}
          hasError={current.isError}
          onName={form.setName}
          onActive={form.setActive}
          onToggle={form.toggle}
        />
      </EntityForm>
    </EntityDialog>
  )
}
