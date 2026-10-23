import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  useBuildings,
  useCategories,
  useDependencies,
  useLocations,
  usePriorities,
  useProblems,
  useReasons,
  useServiceTypes,
  useSubcategories,
} from '@/features/catalogs'
import {
  applyRecaptureChange,
  initialRecaptureValues,
  recaptureChanges,
} from '../domain/recapture'
import type { TicketDetail } from '../domain/types'
import { useActionTime } from './use-action-time'
import { useTicketActions } from './use-ticket-actions'

function dataOf<T>(query: { data?: T[] }): T[] {
  return query.data ?? []
}

function optional(value: string): string | undefined {
  return value ? value : undefined
}

/** Estado y catálogos de la recaptura. */
export function useRecaptureForm(
  ticket: TicketDetail,
  subjectTechnicianId: string | undefined,
  onClose: () => void,
) {
  const time = useActionTime()
  const actions = useTicketActions(ticket.id, subjectTechnicianId, time.iso)
  const [values, setValues] = useState(() => initialRecaptureValues(ticket))
  const [hasError, setHasError] = useState(false)

  const buildings = useBuildings()
  const locations = useLocations(optional(values.buildingId))
  const dependencies = useDependencies()
  const categories = useCategories()
  const subcategories = useSubcategories(optional(values.categoryId))
  const problems = useProblems(optional(values.subcategoryId))
  const serviceTypes = useServiceTypes()
  const priorities = usePriorities()
  const reasons = useReasons('recapture')

  function change(name: keyof typeof values, value: string) {
    setValues((current) => applyRecaptureChange(current, name, value))
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!values.reasonId) {
      setHasError(true)
      return
    }
    actions.recapture.mutate(
      { changes: recaptureChanges(values), reasonId: values.reasonId },
      { onSuccess: onClose },
    )
  }

  return {
    values,
    change,
    submit,
    time,
    hasError,
    isPending: actions.recapture.isPending,
    mutationError: actions.recapture.error,
    catalogs: {
      buildings: dataOf(buildings),
      locations: dataOf(locations),
      dependencies: dataOf(dependencies),
      categories: dataOf(categories),
      subcategories: dataOf(subcategories),
      problems: dataOf(problems),
      serviceTypes: dataOf(serviceTypes),
      priorities: dataOf(priorities),
      reasons: dataOf(reasons),
    },
  }
}
