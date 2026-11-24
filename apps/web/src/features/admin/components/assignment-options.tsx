import { useId, useState } from 'react'
import { SearchIcon } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import type { AdminRow } from '../api/admin-api'
import { adminMessages } from '../i18n'

interface AssignmentOptionsProps {
  kind: 'buildings' | 'categories'
  rows: AdminRow[]
  value: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}

function AssignmentCheckbox({
  id,
  name,
  checked,
  disabled,
  onChange,
}: {
  id: string
  name: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label
      htmlFor={id}
      className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm"
    >
      <Checkbox
        id={id}
        disabled={disabled}
        checked={checked}
        onCheckedChange={(value) => onChange(value === true)}
      />
      {name}
    </label>
  )
}

function AssignmentSearch({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.preventDefault()
        }}
        placeholder={label}
        aria-label={label}
        className="min-h-11 pl-9"
      />
    </div>
  )
}

export function AssignmentOptions({
  kind,
  rows,
  value,
  onChange,
  disabled,
}: AssignmentOptionsProps) {
  const id = useId()
  const [query, setQuery] = useState('')
  const { scopes: t, list } = adminMessages
  const search = kind === 'buildings' ? t.searchBuildings : t.searchCategories
  const term = query.trim().toLocaleLowerCase('es-MX')
  const options = rows.filter((row) =>
    String(row.name).toLocaleLowerCase('es-MX').includes(term),
  )

  return (
    <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">{t[kind]}</legend>
      <AssignmentSearch value={query} onChange={setQuery} label={search} />
      <p role="status" className="text-sm text-muted-foreground">
        {t.selectedCount(value.length)}
      </p>
      <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
        {options.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            {term ? t.noMatches : list.empty}
          </p>
        ) : null}
        {options.map((row) => {
          const optionId = String(row.id)
          return (
            <AssignmentCheckbox
              key={optionId}
              id={`${id}-${optionId}`}
              name={String(row.name)}
              checked={value.includes(optionId)}
              disabled={disabled}
              onChange={(checked) =>
                onChange(
                  checked
                    ? [...value, optionId]
                    : value.filter((item) => item !== optionId),
                )
              }
            />
          )
        })}
      </div>
    </fieldset>
  )
}
