'use client'

import { logger } from '@/lib/utils/logger'
import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { UserProfile } from '@/lib/types/user-profile'

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  isLoading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateUserLocation?: (coordinates: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: React.ReactNode
  initialSession?: Session | null
  initialProfile?: UserProfile | null
}

export function AuthProvider({
  children,
  initialSession = null,
  initialProfile = null,
}: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialSession?.user ?? null)
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile ?? null)
  const [session, setSession] = useState<Session | null>(initialSession ?? null)
  const [isLoading, setIsLoading] = useState(!initialSession)

  const supabase = createClient()

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from('users').select('*').eq('id', userId).single()

      if (error) throw error

      setProfile(data)
    } catch (error) {
      logger.error('Error fetching user profile:', error)
      setProfile(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Skip if we already have initial session
    if (initialSession) {
      setIsLoading(false)
      return
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        fetchUserProfile(session.user.id)
      } else {
        setIsLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        fetchUserProfile(session.user.id)
      } else {
        setProfile(null)
        setIsLoading(false)
      }
    })

    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
  }

  const updateUserLocation = async (coordinates: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('users')
        .update({ location_coordinates: coordinates })
        .eq('id', user.id)

      if (error) throw error

      await refreshProfile()
    } catch (error) {
      logger.error('Error updating user location:', error)
      throw error
    }
  }

  const value = {
    user,
    profile,
    session,
    isLoading,
    signOut,
    refreshProfile,
    updateUserLocation,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
