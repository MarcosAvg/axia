/**
 * Sistema de temas: nombres, modos y resolución de preferencias.
 *
 * Las funciones de este módulo son puras (o reciben explícitamente el DOM) para
 * poder probarlas sin navegador. La preferencia se guarda en `localStorage`; el
 * `<html>` recibe `data-theme` y la clase `.dark`.
 */

export const THEMES = [
  'ocean',
  'neutral',
  'emerald',
  'violet',
  'contrast',
] as const
export type ThemeName = (typeof THEMES)[number]
export const DEFAULT_THEME: ThemeName = 'ocean'

export const COLOR_MODES = ['light', 'dark', 'system'] as const
export type ColorMode = (typeof COLOR_MODES)[number]
export const DEFAULT_COLOR_MODE: ColorMode = 'system'

export type EffectiveMode = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'axia.theme'
export const COLOR_MODE_STORAGE_KEY = 'axia.color-mode'

/** Color de la barra del navegador por modo efectivo. */
export const THEME_COLOR: Record<EffectiveMode, string> = {
  light: '#ffffff',
  dark: '#0e1524',
}

export function isThemeName(value: unknown): value is ThemeName {
  return (
    typeof value === 'string' && (THEMES as readonly string[]).includes(value)
  )
}

export function isColorMode(value: unknown): value is ColorMode {
  return (
    typeof value === 'string' &&
    (COLOR_MODES as readonly string[]).includes(value)
  )
}

/** Tema válido o el predeterminado. */
export function resolveTheme(value: unknown): ThemeName {
  return isThemeName(value) ? value : DEFAULT_THEME
}

/** Modo válido o el predeterminado. */
export function resolveColorMode(value: unknown): ColorMode {
  return isColorMode(value) ? value : DEFAULT_COLOR_MODE
}

/** Modo que se aplica realmente, resolviendo la preferencia del sistema. */
export function resolveEffectiveMode(
  mode: ColorMode,
  systemPrefersDark: boolean,
): EffectiveMode {
  if (mode === 'system') return systemPrefersDark ? 'dark' : 'light'
  return mode
}

/** Aplica tema y modo al elemento raíz. */
export function applyTheme(
  theme: ThemeName,
  effectiveMode: EffectiveMode,
  root: HTMLElement,
): void {
  root.setAttribute('data-theme', theme)
  root.classList.toggle('dark', effectiveMode === 'dark')
  root.style.colorScheme = effectiveMode
}

/** Lee una preferencia de `localStorage`, tolerando entornos sin acceso. */
export function readPreference(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch (error) {
    console.warn(`No se pudo leer la preferencia "${key}"`, error)
    return null
  }
}

/** Guarda una preferencia en `localStorage`, tolerando entornos sin acceso. */
export function writePreference(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch (error) {
    console.warn(`No se pudo guardar la preferencia "${key}"`, error)
  }
}
