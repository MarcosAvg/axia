// Disparadores de sincronización. No se depende de Background Sync del service
// worker porque no existe en iOS Safari (ADR 0004): se sincroniza al abrir la
// app, al recuperar la conexión y al volver a primer plano.
export function startSync(process: () => Promise<void>): () => void {
  const onOnline = () => {
    void process()
  }
  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      void process()
    }
  }

  window.addEventListener('online', onOnline)
  document.addEventListener('visibilitychange', onVisibilityChange)
  void process()

  return () => {
    window.removeEventListener('online', onOnline)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
}
