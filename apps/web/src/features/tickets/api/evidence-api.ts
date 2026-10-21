/** URL autenticada de una evidencia; la cookie de sesión viaja en la petición. */
export async function getEvidenceUrl(evidenceId: string): Promise<string> {
  return `/api/evidence/${evidenceId}/file`
}
