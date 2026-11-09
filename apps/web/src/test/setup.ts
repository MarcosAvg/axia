import '@testing-library/jest-dom/vitest'

// jsdom no implementa scrollTo y TanStack Router lo invoca al navegar.
window.scrollTo = () => {}

// Radix usa ResizeObserver en algunos paneles; jsdom no lo implementa.
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}
