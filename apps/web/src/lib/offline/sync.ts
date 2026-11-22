// Disparadores de sincronización. No se depende de Background Sync del service
// worker porque no existe en iOS Safari (ADR 0004): se sincroniza al abrir la
// app, al recuperar la conexión, al volver a primer plano y con un reintento
// periódico mientras haya una pestaña visible y conexión.
const RETRY_INTERVAL_MS = 30_000

function isVisible(): boolean {
  return (
    typeof document === 'undefined' || document.visibilityState === 'visible'
  )
}

function isOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine
}

export function startSync(process: () => Promise<void>): () => void {
  const run = () => {
    void process().catch((error: unknown) => {
      console.warn('No se pudo procesar la cola offline', error)
    })
  }
  const onVisibilityChange = () => {
    if (isVisible() && isOnline()) run()
  }
  const timer = setInterval(() => {
    onVisibilityChange()
  }, RETRY_INTERVAL_MS)

  window.addEventListener('online', run)
  window.addEventListener('pageshow', onVisibilityChange)
  document.addEventListener('visibilitychange', onVisibilityChange)
  run()

  return () => {
    clearInterval(timer)
    window.removeEventListener('online', run)
    window.removeEventListener('pageshow', onVisibilityChange)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
}
