import type { RequesterOption } from '@/features/catalogs'

/** El solicitante explícito manda; si no hay, se usa la persona vinculada a la cuenta. */
export function effectiveRequester(
  requesters: RequesterOption[],
  requesterId: string,
  ownRequesterId: string | null,
): RequesterOption | undefined {
  const id = requesterId || ownRequesterId
  return id ? requesters.find((requester) => requester.id === id) : undefined
}
