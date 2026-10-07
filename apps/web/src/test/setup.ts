import '@testing-library/jest-dom/vitest'

// jsdom no implementa scrollTo y TanStack Router lo invoca al navegar.
window.scrollTo = () => {}
