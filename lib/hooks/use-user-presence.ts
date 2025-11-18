'use client'

import { logger } from '@/lib/utils/logger'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserPresence } from '@/lib/types/messages.types'
import { TIME_CONSTANTS } from '@/lib/utils/constants'

interface RealtimePayload {
  eventType?: string
  type?: string
  new?: unknown
  old?: unknown
}

export function useUserPresence() {
  const [presenceMap, setPresenceMap] = useState<Record<string, UserPresence>>({})
  const supabase = createClient()
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null)

  // Update own presence status
  const updatePresence = useCallback(async (status: 'online' | 'away' | 'offline') => {
    try {
      const response = await fetch('/api/messages/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      })

      const result = (await response.json()) as {
        error?: string
        data?: UserPresence
      }

      if (!response.ok) {
        // Handle 401 errors gracefully - user is not authenticated
        if (response.status === 401) {
          return // Silently skip presence updates for unauthenticated users
        }
        // Handle 404 errors - user profile not found
        if (response.status === 404) {
          logger.warn('User profile not found, skipping presence update')
          return // Silently skip for missing user profiles
        }
        throw new Error(result.error || 'Failed to update presence')
      }

      // Update local state
      if (result.data) {
        const presenceData = result.data
        setPresenceMap((prev) => ({
          ...prev,
          [presenceData.user_id]: presenceData,
        }))
      }
    } catch (error) {
      // Only log non-401 errors
      if (error instanceof Error && !error.message.includes('401')) {
        logger.error('Error updating presence:', error)
      }
    }
  }, [])

  // Get presence for specific users
  const getPresence = useCallback(async (userIds: string[]) => {
    if (userIds.length === 0) return

    try {
      const response = await fetch(`/api/messages/presence?user_ids=${userIds.join(',')}`, {
        credentials: 'include',
      })
      const result = (await response.json()) as {
        error?: string
        data?: UserPresence[]
      }

      if (!response.ok) {
        // Handle 401 errors gracefully - user is not authenticated
        if (response.status === 401) {
          return // Silently skip presence updates for unauthenticated users
        }
        throw new Error(result.error || 'Failed to get presence')
      }

      // Update local state
      const newPresenceMap: Record<string, UserPresence> = {}
      if (result.data) {
        result.data.forEach((presence: UserPresence) => {
          newPresenceMap[presence.user_id] = presence
        })
      }

      setPresenceMap((prev) => ({
        ...prev,
        ...newPresenceMap,
      }))
    } catch (error) {
      // Only log non-401 errors
      if (error instanceof Error && !error.message.includes('401')) {
        logger.error('Error getting presence:', error)
      }
    }
  }, [])

  // Get presence for a single user
  const getPresenceForUser = useCallback(
    (userId: string): UserPresence | null => {
      return presenceMap[userId] || null
    },
    [presenceMap]
  )

  // Set up presence tracking
  useEffect(() => {
    let isMounted = true

    // Set up heartbeat to maintain online status
    const startHeartbeat = () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
      }
      heartbeatRef.current = setInterval(() => {
        updatePresence('online')
      }, TIME_CONSTANTS.PRESENCE_HEARTBEAT_INTERVAL_MS)
    }

    // Handle page visibility changes
    const handleVisibilityChange = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user || !isMounted) return

        if (document.hidden) {
          updatePresence('away')
          if (heartbeatRef.current) {
            clearInterval(heartbeatRef.current)
            heartbeatRef.current = null
          }
        } else {
          updatePresence('online')
          startHeartbeat()
        }
      } catch {
        // Silently handle auth errors
      }
    }

    // Handle page unload
    const handleBeforeUnload = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user && isMounted) {
          updatePresence('offline')
        }
      } catch {
        // Silently handle auth errors
      }
    }

    // Check if user is authenticated before setting up presence
    const setupPresence = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        // Only set up presence if user is authenticated
        if (!user || !isMounted) {
          return
        }

        // Set initial presence to online
        updatePresence('online')

        // Start heartbeat
        startHeartbeat()

        // Set up event listeners
        document.addEventListener('visibilitychange', handleVisibilityChange)
        window.addEventListener('beforeunload', handleBeforeUnload)
      } catch {
        // Silently handle auth errors
      }
    }

    // Initialize presence after auth check
    setupPresence()

    // Set up real-time subscription for presence changes
    const channel = supabase
      .channel('presence')
      .on(
        'postgres_changes' as const,
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
        },
        (payload: unknown) => {
          logger.info('Presence change received:', payload)

          // Enhanced type validation for realtime payload
          if (!payload || typeof payload !== 'object') {
            logger.warn('Invalid presence payload received:', payload)
            return
          }

          const typedPayload = payload as RealtimePayload
          const eventType = typedPayload.eventType || typedPayload.type
          const newRecord = typedPayload.new
          const oldRecord = typedPayload.old

          if (eventType === 'INSERT' || eventType === 'UPDATE') {
            // Validate new record structure
            if (!newRecord || typeof newRecord !== 'object') {
              logger.warn('Invalid presence record in payload:', newRecord)
              return
            }

            const recordObj = newRecord as Record<string, unknown>
            if (!recordObj.user_id) {
              logger.warn('Invalid presence record in payload:', newRecord)
              return
            }

            // Type guard for UserPresence
            const isValidPresence = (record: unknown): record is UserPresence => {
              if (!record || typeof record !== 'object') return false
              const r = record as Record<string, unknown>
              return (
                typeof r.user_id === 'string' &&
                typeof r.status === 'string' &&
                ['online', 'away', 'offline'].includes(r.status) &&
                typeof r.last_seen_at === 'string' &&
                typeof r.updated_at === 'string'
              )
            }

            if (!isValidPresence(newRecord)) {
              logger.warn('Presence record does not match UserPresence interface:', newRecord)
              return
            }

            setPresenceMap((prev) => ({
              ...prev,
              [newRecord.user_id]: newRecord as UserPresence,
            }))
          } else if (eventType === 'DELETE') {
            // Validate old record for deletion
            if (!oldRecord || typeof oldRecord !== 'object') {
              logger.warn('Invalid old record in delete payload:', oldRecord)
              return
            }
            const oldRecordObj = oldRecord as Record<string, unknown>
            const userId = oldRecordObj.user_id
            if (!userId || typeof userId !== 'string') {
              logger.warn('Invalid user_id in delete payload:', oldRecord)
              return
            }

            setPresenceMap((prev) => {
              const updated = { ...prev }
              delete updated[userId]
              return updated
            })
          }
        }
      )
      .subscribe()

    return () => {
      isMounted = false

      // Cleanup
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
        heartbeatRef.current = null
      }

      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)

      // Set offline status on cleanup (only if authenticated)
      supabase.auth
        .getUser()
        .then(({ data: { user } }) => {
          if (user) {
            updatePresence('offline')
          }
        })
        .catch(() => {
          // Silently handle auth errors
        })

      supabase.removeChannel(channel)
    }
  }, [updatePresence, supabase])

  return {
    presenceMap,
    updatePresence,
    getPresence,
    getPresenceForUser,
  }
}
