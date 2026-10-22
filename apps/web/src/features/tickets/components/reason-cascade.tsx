import { useState } from 'react'
import { SelectField } from '@/components/shared/form-fields'
import { childReasons, pathToReason } from '@/features/catalogs'
import type { ReasonOption } from '@/features/catalogs'
import { pauseMessages } from '../pause-i18n'

interface ReasonCascadeProps {
  label: string
  reasons: ReasonOption[]
  rootId: string | null
  value: string
  error?: string
  onChange: (value: string) => void
}

const PLACEHOLDER = 'Selecciona…'

/**
 * Selector en cascada del árbol de motivos: cada select ofrece los hijos del anterior.
 * El último elegido es el subestado (lo que se envía en `onChange`).
 */
export function ReasonCascade({
  label,
  reasons,
  rootId,
  value,
  error,
  onChange,
}: ReasonCascadeProps) {
  const [path, setPath] = useState<string[]>(() =>
    pathToReason(reasons, rootId, value),
  )
  if (!rootId) return null

  const nameOf = (id: string | null | undefined) =>
    reasons.find((reason) => reason.id === id)?.name ?? ''
  const levels: {
    index: number
    label: string
    options: { value: string; label: string }[]
  }[] = []
  for (let index = 0; index <= path.length; index++) {
    const parentId = index === 0 ? rootId : path[index - 1]
    const options = childReasons(reasons, parentId).map((reason) => ({
      value: reason.id,
      label: reason.name,
    }))
    if (index > 0 && options.length === 0) break
    levels.push({
      index,
      label:
        index === 0 ? label : `${pauseMessages.child} · ${nameOf(parentId)}`,
      options,
    })
  }

  function select(index: number, next: string) {
    const truncated = path.slice(0, index)
    if (next) truncated.push(next)
    setPath(truncated)
    onChange(truncated[truncated.length - 1] ?? '')
  }

  return (
    <div className="flex flex-col gap-3">
      {levels.map((level) => (
        <SelectField
          key={level.index}
          id={`action-reason-${level.index}`}
          label={level.label}
          placeholder={PLACEHOLDER}
          options={level.options}
          value={path[level.index] ?? ''}
          error={level.index === levels.length - 1 ? error : undefined}
          onChange={(event) => select(level.index, event.target.value)}
        />
      ))}
    </div>
  )
}
