import { isAuthSessionMissingError } from '@supabase/supabase-js'
import type { Session, SupabaseClient, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { UserProfile } from '@/lib/types/user-profile'
import { logger } from '@/lib/utils/logger'

export interface ServerAuthState {
  session: Session | null
  profile: UserProfile | null
  user: User | null
}

export async function getServerAuthState(
  supabaseClient?: SupabaseClient
): Promise<ServerAuthState> {
  const supabase = supabaseClient ?? (await createClient())

  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    if (isAuthSessionMissingError(userError)) {
      return { session: null, profile: null, user: null }
    }

    logger.error('Failed to authenticate user on server', userError)
    return { session: null, profile: null, user: null }
  }

  const user = userData?.user ?? null

  if (!user) {
    return { session: null, profile: null, user: null }
  }

  // Note: We use the authenticated user from getUser() above, not from session
  // Session data comes from cookies and may not be verified, so we always use
  // the user object from getUser() which is authenticated by the auth server
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) {
    logger.error('Failed to resolve server session', sessionError)
    return { session: null, profile: null, user }
  }

  // Always use the authenticated user from getUser(), not session.user
  const resolvedSession = session ? { ...session, user } : null

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select(
      'id, email, phone, anonymous_handle, avatar_seed, location_city, location_coordinates, is_banned, created_at'
    )
    .eq('id', user.id)
    .single()

  if (profileError) {
    logger.error('Failed to resolve server profile', profileError)
    return { session: resolvedSession, profile: null, user }
  }

  return { session: resolvedSession, profile, user }
}
