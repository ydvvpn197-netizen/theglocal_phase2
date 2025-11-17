/**
 * Generic Realtime Subscription Hook Factory
 *
 * Provides a reusable pattern for subscribing to Supabase Realtime changes
 * with connection management, error handling, and cleanup.
 *
 * @example
 * ```ts
 * const { isConnected, error } = useRealtimeSubscription({
 *   table: 'posts',
 *   subscriptionKey: 'feed-posts',
 *   filter: 'community_id=eq.123',
 *   onInsert: (post) => console.log('New post:', post),
 *   onUpdate: (id, updates) => console.log('Post updated:', id, updates),
 *   onDelete: (id) => console.log('Post deleted:', id),
 *   transformPayload: (payload) => payload.new as Post,
 *   validatePayload: (payload) => isPostPayload(payload),
 * })
 * ```
 */

'use client'

import { log } from '@/lib/utils/logger'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  realtimeConnectionManager,
  generateSubscriptionKey,
  retryWithBackoff,
} from '@/lib/utils/realtime-connection-manager'
import { RealtimeChannel } from '@supabase/supabase-js'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface RealtimeSubscriptionConfig<T = unknown> {
  /** Table name to subscribe to */
  table: string
  /** Unique subscription key (will be prefixed with table name if not provided) */
  subscriptionKey: string
  /** Optional filter string (e.g., 'community_id=eq.123') */
  filter?: string
  /** Callback for INSERT events */
  onInsert?: (data: T) => void | Promise<void>
  /** Callback for UPDATE events */
  onUpdate?: (id: string, data: Partial<T>) => void | Promise<void>
  /** Callback for DELETE events */
  onDelete?: (id: string) => void | Promise<void>
  /** Transform payload to expected type */
  transformPayload?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => T
  /** Validate payload before processing */
  validatePayload?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => boolean
  /** Schema name (default: 'public') */
  schema?: string
  /** Additional dependencies that should trigger re-subscription */
  dependencies?: unknown[]
}

export interface RealtimeSubscriptionResult {
  /** Whether the subscription is currently connected */
  isConnected: boolean
  /** Error message if connection failed */
  error: string | null
}

/**
 * Generic hook for subscribing to Supabase Realtime changes
 */
export function useRealtimeSubscription<T = unknown>({
  table,
  subscriptionKey,
  filter,
  onInsert,
  onUpdate,
  onDelete,
  transformPayload,
  validatePayload,
  schema = 'public',
  dependencies = [],
}: RealtimeSubscriptionConfig<T>): RealtimeSubscriptionResult {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const callbacksRef = useRef({ onInsert, onUpdate, onDelete })
  const isSubscribedRef = useRef(false)

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = { onInsert, onUpdate, onDelete }
  }, [onInsert, onUpdate, onDelete])

  useEffect(() => {
    const supabase = createClient()

    // Generate full subscription key
    const fullKey = generateSubscriptionKey(table, subscriptionKey, filter || 'all')

    try {
      // Create channel using connection manager
      const channel = realtimeConnectionManager.getChannel(fullKey, () => {
        return supabase.channel(fullKey)
      })

      channelRef.current = channel
      isSubscribedRef.current = false
      setError(null)

      // Helper to transform and validate payload
      const processPayload = (
        payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
        eventType: 'INSERT' | 'UPDATE' | 'DELETE'
      ): T | null => {
        // Validate payload if validator provided
        if (validatePayload && !validatePayload(payload)) {
          log.warn(`[RealtimeSubscription] Invalid ${eventType} payload for ${table}`)
          return null
        }

        // Transform payload if transformer provided
        if (transformPayload) {
          try {
            return transformPayload(payload)
          } catch (err) {
            log.error(`[RealtimeSubscription] Error transforming ${eventType} payload:`, err)
            return null
          }
        }

        // Default: use payload.new for INSERT/UPDATE, payload.old for DELETE
        if (eventType === 'DELETE') {
          return (payload.old as T) || null
        }
        return (payload.new as T) || null
      }

      // Subscribe to INSERT events
      if (onInsert) {
        channel.on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema,
            table,
            filter,
          },
          async (payload) => {
            if (!isSubscribedRef.current) {
              log.warn(
                `[RealtimeSubscription] Received INSERT event before subscription ready for ${table}`
              )
              return
            }

            const data = processPayload(payload, 'INSERT')
            if (data) {
              try {
                await callbacksRef.current.onInsert?.(data)
              } catch (err) {
                log.error(`[RealtimeSubscription] Error in onInsert callback for ${table}:`, err)
              }
            }
          }
        )
      }

      // Subscribe to UPDATE events
      if (onUpdate) {
        channel.on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema,
            table,
            filter,
          },
          async (payload) => {
            if (!isSubscribedRef.current) {
              log.warn(
                `[RealtimeSubscription] Received UPDATE event before subscription ready for ${table}`
              )
              return
            }

            const data = processPayload(payload, 'UPDATE')
            if (data && payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
              try {
                await callbacksRef.current.onUpdate?.(payload.new.id as string, data as Partial<T>)
              } catch (err) {
                log.error(`[RealtimeSubscription] Error in onUpdate callback for ${table}:`, err)
              }
            }
          }
        )
      }

      // Subscribe to DELETE events
      if (onDelete) {
        channel.on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema,
            table,
            filter,
          },
          async (payload) => {
            if (!isSubscribedRef.current) {
              log.warn(
                `[RealtimeSubscription] Received DELETE event before subscription ready for ${table}`
              )
              return
            }

            if (payload.old && typeof payload.old === 'object' && 'id' in payload.old) {
              try {
                await callbacksRef.current.onDelete?.(payload.old.id as string)
              } catch (err) {
                log.error(`[RealtimeSubscription] Error in onDelete callback for ${table}:`, err)
              }
            }
          }
        )
      }

      // Subscribe to channel
      channel.subscribe((status) => {
        log.info(`[RealtimeSubscription] ${table} subscription status:`, status)

        if (status === 'SUBSCRIBED') {
          isSubscribedRef.current = true
          setIsConnected(true)
          setError(null)
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          isSubscribedRef.current = false
          setIsConnected(false)
          setError(`Failed to subscribe to ${table} updates: ${status}`)
        } else if (status === 'CLOSED') {
          isSubscribedRef.current = false
          setIsConnected(false)
        } else {
          setIsConnected(status === 'SUBSCRIBED')
          if (status === 'CHANNEL_ERROR') {
            setError(`Failed to subscribe to ${table} updates`)
          } else {
            setError(null)
          }
        }
      })

      // Cleanup on unmount
      return () => {
        try {
          if (channelRef.current) {
            realtimeConnectionManager.releaseChannel(fullKey, channelRef.current)
          }
          isSubscribedRef.current = false
        } catch (err) {
          log.error(`[RealtimeSubscription] Error cleaning up ${table} subscription:`, err)
        }
      }
    } catch (err) {
      log.error(`[RealtimeSubscription] Error setting up ${table} subscription:`, err)
      setError(err instanceof Error ? err.message : 'Failed to setup subscription')
      setIsConnected(false)

      // Retry with exponential backoff
      const retryConfig = realtimeConnectionManager.getRetryConfig()
      retryWithBackoff(
        async () => {
          // Retry logic will be handled by useEffect re-running
          return Promise.resolve()
        },
        retryConfig,
        (attempt) => {
          log.info(
            `[RealtimeSubscription] Retrying ${table} subscription setup (attempt ${attempt})...`
          )
          setError(`Retrying connection... (${attempt}/${retryConfig.maxRetries})`)
        }
      ).catch(() => {
        setError('Failed to connect after multiple retries')
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, subscriptionKey, filter, schema, ...dependencies])

  return { isConnected, error }
}
