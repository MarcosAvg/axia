import {
  invalid,
  loadCategory,
  requireActive,
  validateLocation,
  validateProblem,
  validateSubcategory,
} from './create-validation.js'
import type { DbExecutor } from './db.js'
import { assertRecapturePair } from './dependency-location.js'
import {
  changed,
  resolved,
  type RecaptureValidationInput,
} from './recapture-input.js'

async function validateRecapturePlace(
  tx: DbExecutor,
  { current, changes }: RecaptureValidationInput,
): Promise<void> {
  if (
    !changed(changes.buildingId, current.buildingId) &&
    !changed(changes.locationId, current.locationId)
  ) {
    return
  }
  const buildingId = changes.buildingId ?? current.buildingId
  const locationId = changes.locationId ?? current.locationId
  await requireActive(tx, 'buildings', buildingId, 'Edificio')
  await validateLocation(tx, locationId, buildingId)
}

function assertClassificationComplete(input: {
  categoryChanged: boolean
  subcategoryChanged: boolean
  problemChanged: boolean
  subcategoryId: string | null
  problemId: string | null
}) {
  if (
    !input.categoryChanged &&
    !input.subcategoryChanged &&
    !input.problemChanged
  ) {
    return
  }
  if (!input.subcategoryId) throw invalid('Selecciona una subcategoría')
  if (!input.problemId) throw invalid('Selecciona un problema')
}

async function validateRecaptureClassification(
  tx: DbExecutor,
  { current, changes }: RecaptureValidationInput,
): Promise<void> {
  const categoryChanged = changed(changes.categoryId, current.categoryId)
  const subcategoryChanged = changed(
    changes.subcategoryId,
    current.subcategoryId,
  )
  const problemChanged = changed(changes.problemId, current.problemId)
  if (!categoryChanged && !subcategoryChanged && !problemChanged) return

  const categoryId = resolved(changes.categoryId, current.categoryId)
  if (categoryChanged) await loadCategory(tx, categoryId)

  const subcategoryId = resolved(changes.subcategoryId, current.subcategoryId)
  const problemId = resolved(changes.problemId, current.problemId)
  assertClassificationComplete({
    categoryChanged,
    subcategoryChanged,
    problemChanged,
    subcategoryId,
    problemId,
  })
  if (subcategoryId) {
    await validateSubcategory(tx, categoryId, subcategoryId)
  }
  if (problemId) {
    await validateProblem(tx, subcategoryId as string, problemId)
  }
}

async function validateRecaptureReferences(
  tx: DbExecutor,
  { current, changes }: RecaptureValidationInput,
): Promise<void> {
  if (changed(changes.dependencyId, current.dependencyId)) {
    await requireActive(
      tx,
      'dependencies',
      changes.dependencyId as string,
      'Dependencia',
    )
  }
  if (changed(changes.serviceTypeId, current.serviceTypeId)) {
    if (changes.serviceTypeId) {
      await requireActive(
        tx,
        'service_types',
        changes.serviceTypeId,
        'Tipo de servicio',
      )
    }
  }
  if (changed(changes.priorityId, current.priorityId)) {
    await requireActive(
      tx,
      'priorities',
      changes.priorityId as string,
      'Prioridad',
    )
  }
}

function validateRecaptureRequesterDependency({
  current,
  changes,
  requesterDependencyId,
}: RecaptureValidationInput): void {
  if (!requesterDependencyId) return
  const placeChanged =
    changed(changes.buildingId, current.buildingId) ||
    changed(changes.locationId, current.locationId) ||
    changed(changes.dependencyId, current.dependencyId)
  if (!placeChanged) return
  const dependencyId = changes.dependencyId ?? current.dependencyId
  if (dependencyId !== requesterDependencyId) {
    throw invalid('La dependencia no corresponde al solicitante')
  }
}

/**
 * La recaptura valida solo lo que cambia (o de lo que depende) para no bloquear
 * correcciones de textos en tiquets antiguos con catálogos desactivados.
 */
export async function validateRecaptureInputs(
  tx: DbExecutor,
  input: RecaptureValidationInput,
): Promise<void> {
  await validateRecapturePlace(tx, input)
  await validateRecaptureClassification(tx, input)
  await validateRecaptureReferences(tx, input)
  validateRecaptureRequesterDependency(input)
  await assertRecapturePair(tx, input)
}
