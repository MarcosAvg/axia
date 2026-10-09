import { describe, expect, it } from 'vitest'
import {
  COLOR_MODE_STORAGE_KEY,
  DEFAULT_COLOR_MODE,
  DEFAULT_THEME,
  applyTheme,
  readPreference,
  resolveColorMode,
  resolveEffectiveMode,
  resolveTheme,
  writePreference,
} from './theme'

describe('resolveTheme', () => {
  it('acepta un tema válido', () => {
    expect(resolveTheme('emerald')).toBe('emerald')
  })

  it('cae al tema predeterminado con un valor inválido', () => {
    expect(resolveTheme('inexistente')).toBe(DEFAULT_THEME)
    expect(resolveTheme(null)).toBe(DEFAULT_THEME)
  })
})

describe('resolveColorMode', () => {
  it('acepta un modo válido', () => {
    expect(resolveColorMode('dark')).toBe('dark')
  })

  it('cae al modo predeterminado con un valor inválido', () => {
    expect(resolveColorMode('azul')).toBe(DEFAULT_COLOR_MODE)
    expect(resolveColorMode(undefined)).toBe(DEFAULT_COLOR_MODE)
  })
})

describe('resolveEffectiveMode', () => {
  it('respeta la preferencia explícita', () => {
    expect(resolveEffectiveMode('light', true)).toBe('light')
    expect(resolveEffectiveMode('dark', false)).toBe('dark')
  })

  it('sigue al sistema cuando el modo es "system"', () => {
    expect(resolveEffectiveMode('system', true)).toBe('dark')
    expect(resolveEffectiveMode('system', false)).toBe('light')
  })
})

describe('applyTheme', () => {
  it('fija el tema, la clase dark y el colorScheme', () => {
    const root = document.createElement('div')

    applyTheme('violet', 'dark', root)
    expect(root.getAttribute('data-theme')).toBe('violet')
    expect(root.classList.contains('dark')).toBe(true)
    expect(root.style.colorScheme).toBe('dark')

    applyTheme('ocean', 'light', root)
    expect(root.getAttribute('data-theme')).toBe('ocean')
    expect(root.classList.contains('dark')).toBe(false)
    expect(root.style.colorScheme).toBe('light')
  })
})

describe('preferencias en localStorage', () => {
  it('escribe y lee una preferencia', () => {
    writePreference(COLOR_MODE_STORAGE_KEY, 'dark')
    expect(readPreference(COLOR_MODE_STORAGE_KEY)).toBe('dark')
    window.localStorage.clear()
  })

  it('devuelve null si la clave no existe', () => {
    expect(readPreference('axia.inexistente')).toBeNull()
  })
})
