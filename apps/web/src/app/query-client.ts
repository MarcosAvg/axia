import { OFFLINE_CACHE_TTL_MS } from '@/lib/offline/cache-policy'
import { onlineManager, QueryClient } from '@tanstack/react-query'

// Al reabrir sin señal, el evento offline ya pudo ocurrir antes de cargar la app.
if (typeof navigator !== 'undefined') onlineManager.setOnline(navigator.onLine)

export const queryClient = new QueryClient()

queryClient.setQueryDefaults(['tickets'], { gcTime: OFFLINE_CACHE_TTL_MS })
queryClient.setQueryDefaults(['catalogs'], { gcTime: OFFLINE_CACHE_TTL_MS })
