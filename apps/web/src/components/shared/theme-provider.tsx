import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  COLOR_MODE_STORAGE_KEY,
  THEME_COLOR,
  THEME_STORAGE_KEY,
  applyTheme,
  readPreference,
  resolveColorMode,
  resolveEffectiveMode,
  resolveTheme,
  writePreference,
} from '@/lib/theme'
import type { ColorMode, EffectiveMode, ThemeName } from '@/lib/theme'
import { ThemeContext } from './theme-context'
import type { ThemeContextValue } from './theme-context'

function systemPrefersDark(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
}

function updateThemeColorMeta(effectiveMode: EffectiveMode): void {
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', THEME_COLOR[effectiveMode])
  }
}

/** Preferencia de tema y modo, aplicada al documento y persistida. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() =>
    resolveTheme(readPreference(THEME_STORAGE_KEY)),
  )
  const [mode, setModeState] = useState<ColorMode>(() =>
    resolveColorMode(readPreference(COLOR_MODE_STORAGE_KEY)),
  )
  const [systemDark, setSystemDark] = useState<boolean>(systemPrefersDark)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event: MediaQueryListEvent) =>
      setSystemDark(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const effectiveMode = resolveEffectiveMode(mode, systemDark)

  useEffect(() => {
    applyTheme(theme, effectiveMode, document.documentElement)
    updateThemeColorMeta(effectiveMode)
  }, [theme, effectiveMode])

  const setTheme = useCallback((next: ThemeName) => {
    setThemeState(next)
    writePreference(THEME_STORAGE_KEY, next)
  }, [])

  const setMode = useCallback((next: ColorMode) => {
    setModeState(next)
    writePreference(COLOR_MODE_STORAGE_KEY, next)
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, mode, effectiveMode, setTheme, setMode }),
    [theme, mode, effectiveMode, setTheme, setMode],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
