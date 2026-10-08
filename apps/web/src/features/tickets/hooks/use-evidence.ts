import { useQuery } from '@tanstack/react-query'
import { getEvidenceUrl } from '../api/evidence-api'

const evidenceKeys = {
  url: (path: string) => ['evidence', 'url', path] as const,
}

export function useEvidenceUrl(storagePath: string | null) {
  return useQuery({
    queryKey: evidenceKeys.url(storagePath ?? ''),
    queryFn: () =>
      storagePath ? getEvidenceUrl(storagePath) : Promise.resolve(null),
    enabled: Boolean(storagePath),
    staleTime: 5 * 60 * 1000,
  })
}
