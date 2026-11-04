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
  const onOnline = () => {
    void process()
  }
  const onVisibilityChange = () => {
    if (isVisible()) {
      void process()
    }
  }
  const timer = setInterval(() => {
    if (isVisible() && isOnline()) {
      void process()
    }
  }, RETRY_INTERVAL_MS)

  window.addEventListener('online', onOnline)
  document.addEventListener('visibilitychange', onVisibilityChange)
  void process()

  return () => {
    clearInterval(timer)
    window.removeEventListener('online', onOnline)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
}
