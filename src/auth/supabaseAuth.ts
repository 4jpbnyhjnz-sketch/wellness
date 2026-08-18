import { supabase } from '../supabaseClient'
import type { AuthUser } from './types'

function mapSessionUserToAuthUser(user: {
  id: string
  login?: string | null
  user_metadata?: { full_name?: string }
  app_metadata?: { role?: string }
}): AuthUser {

  const login = user.login ?? ''
  const displayName = user.user_metadata?.full_name ?? login ?? 'Utilisateur'
  const role = user.app_metadata?.role ?? 'authenticated'

  return {
    id: user.id,
    login,
    displayName,
    role,
  }
}

export async function loginWithSupabase(
  identifier: string,
  password: string,
): Promise<AuthUser> {
  const login = identifier.trim().toLowerCase()

  if (!login || !password) {
    throw new Error('Merci de renseigner identifiant et mot de passe.')
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    login,
    password,
  })

  if (error) {
    throw new Error(error.message)
  }

  if (!data.user) {
    throw new Error('Connexion impossible: utilisateur introuvable.')
  }

  return mapSessionUserToAuthUser(data.user)
}
