import { createClient } from '@supabase/supabase-js'
import type { Database } from '@axia/shared'
import { getRuntimeConfig } from './runtime-config'

// Cliente único de Supabase. Solo `features/*/api` y `lib/` pueden importarlo
// (sección 4 de docs/convenciones-codigo.md). La clave pública va en el cliente
// por diseño; la service role key nunca sale del servidor.
// La configuración llega en runtime (`config.js`) o del build (`VITE_*`).
const { supabaseUrl, supabaseAnonKey } = getRuntimeConfig()

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
