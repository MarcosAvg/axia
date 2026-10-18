import { useState } from 'react'
import type { FormEvent } from 'react'
import { SearchIcon } from 'lucide-react'
import { cn } from 'cn'
import { Input } from '@/components/ui/input'
import type { Profile } from '../domain/access'
import { adminMessages } from '../i18n'
import { EntityDialog } from './entity-dialog'
import { EntityForm } from './entity-form'

function OptionButton({
  selected,
  label,
  onClick,
}: {
  selected: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'flex min-h-10 w-full items-center rounded-lg border px-3 text-left text-sm transition-colors',
        selected
          ? 'border-ring bg-muted font-medium text-foreground'
          : 'border-transparent hover:bg-muted/50',
      )}
    >
      {label}
    </button>
  )
}

function ProfileList({
  profiles,
  selected,
  onSelect,
}: {
  profiles: Profile[]
  selected: string | null
  onSelect: (userId: string | null) => void
}) {
  const { users } = adminMessages
  return (
    <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
      <OptionButton
        selected={selected === null}
        label={users.noLink}
        onClick={() => onSelect(null)}
      />
      {profiles.map((profile) => (
        <OptionButton
          key={profile.id}
          selected={selected === profile.id}
          label={profile.fullName}
          onClick={() => onSelect(profile.id)}
        />
      ))}
    </div>
  )
}

interface LinkDialogProps {
  title: string
  description: string
  personName: string
  profiles: Profile[]
  currentUserId: string | null
  isSaving: boolean
  onSave: (userId: string | null) => void
  onClose: () => void
}

/** Diálogo para vincular una persona del catálogo con una cuenta. */
export function LinkDialog({
  title,
  description,
  personName,
  profiles,
  currentUserId,
  isSaving,
  onSave,
  onClose,
}: LinkDialogProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(currentUserId)
  const { users } = adminMessages

  const term = query.trim().toLocaleLowerCase('es-MX')
  const options = term
    ? profiles.filter((profile) =>
        profile.fullName.toLocaleLowerCase('es-MX').includes(term),
      )
    : profiles

  function submit(event: FormEvent) {
    event.preventDefault()
    onSave(selected)
  }

  return (
    <EntityDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={title}
      description={`${personName} · ${description}`}
    >
      <EntityForm onSubmit={submit} onCancel={onClose} isSaving={isSaving}>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={users.searchProfiles}
            aria-label={users.searchProfiles}
            className="pl-9"
          />
        </div>
        <ProfileList
          profiles={options}
          selected={selected}
          onSelect={setSelected}
        />
      </EntityForm>
    </EntityDialog>
  )
}
