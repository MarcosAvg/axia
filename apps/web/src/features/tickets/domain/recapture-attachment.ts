/** ¿La recaptura necesita un archivo nuevo para el problema destino? */
export function needsRecaptureAttachment(input: {
  problemChanged: boolean
  requiredTypes: string[]
  attachedTypes: string[]
}): boolean {
  if (!input.problemChanged || input.requiredTypes.length === 0) return false
  return !input.requiredTypes.some((type) => input.attachedTypes.includes(type))
}
