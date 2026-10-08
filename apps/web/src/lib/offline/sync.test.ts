import { startSync } from './sync'

describe('disparadores de sincronización', () => {
  it('procesa al abrir la app', async () => {
    const process = vi.fn(async () => {})
    const stop = startSync(process)

    expect(process).toHaveBeenCalledTimes(1)
    stop()
  })

  it('procesa al recuperar la conexión', async () => {
    const process = vi.fn(async () => {})
    const stop = startSync(process)
    process.mockClear()

    window.dispatchEvent(new Event('online'))

    expect(process).toHaveBeenCalledTimes(1)
    stop()
  })

  it('procesa al volver a primer plano', async () => {
    const process = vi.fn(async () => {})
    const stop = startSync(process)
    process.mockClear()

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })
    document.dispatchEvent(new Event('visibilitychange'))

    expect(process).toHaveBeenCalledTimes(1)
    stop()
  })

  it('deja de procesar al detenerse', async () => {
    const process = vi.fn(async () => {})
    const stop = startSync(process)
    process.mockClear()
    stop()

    window.dispatchEvent(new Event('online'))

    expect(process).not.toHaveBeenCalled()
  })
})
