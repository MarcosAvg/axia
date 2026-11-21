import { onlineManager } from '@tanstack/react-query'

it('empieza con las consultas pausadas al arrancar sin red', async () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
  try {
    await import('./query-client')
    expect(onlineManager.isOnline()).toBe(false)
  } finally {
    onlineManager.setOnline(true)
    vi.restoreAllMocks()
  }
})
