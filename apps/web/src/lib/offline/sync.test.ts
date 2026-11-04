import { startSync } from './sync'

const RETRY_INTERVAL_MS = 30_000

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

describe('reintento periódico', () => {
  it('reintenta mientras está visible y en línea', async () => {
    vi.useFakeTimers()
    const process = vi.fn(async () => {})
    const stop = startSync(process)
    process.mockClear()

    try {
      vi.advanceTimersByTime(RETRY_INTERVAL_MS)
      expect(process).toHaveBeenCalledTimes(1)

      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: false,
      })
      vi.advanceTimersByTime(RETRY_INTERVAL_MS)
      expect(process).toHaveBeenCalledTimes(1)
    } finally {
      stop()
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: true,
      })
      vi.useRealTimers()
    }
  })

  it('no reintenta si la pestaña está oculta', async () => {
    vi.useFakeTimers()
    const process = vi.fn(async () => {})
    const stop = startSync(process)
    process.mockClear()

    try {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'hidden',
      })
      vi.advanceTimersByTime(RETRY_INTERVAL_MS)
      expect(process).not.toHaveBeenCalled()
    } finally {
      stop()
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'visible',
      })
      vi.useRealTimers()
    }
  })
})
