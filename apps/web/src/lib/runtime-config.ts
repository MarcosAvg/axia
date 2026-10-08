export interface AxiaRuntimeConfig {
  supabaseUrl: string
  supabaseAnonKey: string
}

declare global {
  interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL?: string
    readonly VITE_SUPABASE_ANON_KEY?: string
  }
  interface Window {
    __AXIA_CONFIG__?: Partial<AxiaRuntimeConfig>
  }
}

function readRuntimeConfig(): Partial<AxiaRuntimeConfig> {
  if (typeof window === 'undefined') return {}
  return window.__AXIA_CONFIG__ ?? {}
}

/**
 * Configuración de runtime: la genera `config.js` al arrancar el contenedor (ver
 * `deploy/`), con **respaldo a las variables de build** (`VITE_SUPABASE_*`) para
 * desarrollo y pruebas. Así una misma imagen sirve para cualquier instalación.
 */
export function getRuntimeConfig(): AxiaRuntimeConfig {
  const runtime = readRuntimeConfig()
  const supabaseUrl = runtime.supabaseUrl ?? import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey =
    runtime.supabaseAnonKey ?? import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Falta la configuración de Supabase: revisa config.js o VITE_SUPABASE_*.',
    )
  }
  return { supabaseUrl, supabaseAnonKey }
}
