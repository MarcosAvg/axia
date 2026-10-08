import { createClient } from '@supabase/supabase-js'
import type { Database } from '@axia/shared'

// Cliente único de Supabase. Solo `features/*/api` y `lib/` pueden importarlo
// (sección 4 de docs/convenciones-codigo.md). La clave pública va en el cliente
// por diseño; la service role key nunca sale del servidor.
export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)
