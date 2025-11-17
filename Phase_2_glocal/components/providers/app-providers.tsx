'use client'

import type { Session } from '@supabase/supabase-js'
import { QueryProvider } from '@/lib/providers/query-provider'
import { AuthProvider } from '@/lib/context/auth-context'
import { LocationProvider } from '@/lib/context/location-context'
import { NotificationProvider } from '@/lib/context/notification-context'
import { MessagesProvider } from '@/lib/context/messages-context'
import type { UserProfile } from '@/lib/types/user-profile'

interface AppProvidersProps {
  children: React.ReactNode
  initialSession?: Session | null
  initialProfile?: UserProfile | null
  initialUnreadCount?: number
}

export function AppProviders({
  children,
  initialSession = null,
  initialProfile = null,
  initialUnreadCount = 0,
}: AppProvidersProps) {
  return (
    <QueryProvider>
      <AuthProvider initialSession={initialSession} initialProfile={initialProfile}>
        <LocationProvider>
          <NotificationProvider>
            <MessagesProvider initialUnreadCount={initialUnreadCount}>{children}</MessagesProvider>
          </NotificationProvider>
        </LocationProvider>
      </AuthProvider>
    </QueryProvider>
  )
}
