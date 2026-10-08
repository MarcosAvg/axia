// Acceso a datos del feature de autenticación. Única capa que habla con Supabase
// (sección 8 de convenciones). Los componentes usan los hooks de `features/auth`.

import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Identity } from '../domain/identity'
import { parseIdentity } from '../schemas'

/** Tipo de sesión, reexportado para no importar `@supabase/supabase-js` fuera de `api/`. */
export type AuthSession = Session

export interface ProfileUpdateInput {
  fullName: string
  phone: string | null
}

/** Sesión actual, o `null` si no hay. */
export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

/** Se suscribe a los cambios de sesión y devuelve la función para cancelar. */
export function subscribeToAuthChanges(
  onSession: (session: Session | null) => void,
): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    onSession(session)
  })
  return () => {
    data.subscription.unsubscribe()
  }
}

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/** Identidad del usuario en sesión (perfil, roles y permisos). */
export async function fetchIdentity(): Promise<Identity> {
  const { data, error } = await supabase.rpc('me')
  if (error) throw error
  return parseIdentity(data)
}

export async function updateProfile(input: ProfileUpdateInput): Promise<void> {
  const { error } = await supabase.rpc('profile_update', {
    p_full_name: input.fullName,
    p_phone: input.phone ?? undefined,
  })
  if (error) throw error
}
