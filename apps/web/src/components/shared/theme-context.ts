import { createContext, useContext } from 'react'
import type { ColorMode, EffectiveMode, ThemeName } from '@/lib/theme'

export interface ThemeContextValue {
  theme: ThemeName
  mode: ColorMode
  effectiveMode: EffectiveMode
  setTheme: (theme: ThemeName) => void
  setMode: (mode: ColorMode) => void
}

/** Contexto de tema. Exportado para las pruebas; en el código usa `useTheme`. */
export const ThemeContext = createContext<ThemeContextValue | null>(null)

/** Tema, modo y acciones. Debe usarse dentro de `<ThemeProvider>`. */
export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext)
  if (!value) {
    throw new Error('useTheme debe usarse dentro de <ThemeProvider>')
  }
  return value
}
