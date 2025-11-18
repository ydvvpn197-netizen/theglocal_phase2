'use client'

import { logger } from '@/lib/utils/logger'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  realtimeConnectionManager,
  generateSubscriptionKey,
} from '@/lib/utils/realtime-connection-manager'
import { RealtimeChannel } from '@supabase/supabase-js'
import { PollRow } from '@/lib/types/realtime.types'
import { isPollPayload } from '@/lib/types/type-guards'

interface Poll {
  id: string
  community_id: string
  author_id: string
  question: string
  category: string
  expires_at: string | null
  tagged_authority: string | null
  total_votes: number
  upvotes: number
  downvotes: number
  comment_count: number
  created_at: string
  author?: {
    anonymous_handle: string
    avatar_seed: string
  }
  community?: {
    name: string
    slug: string
  }
  options: Array<{
    id: string
    text: string
    vote_count: number
  }>
}

interface UsePollFeedRealtimeProps {
  communityId?: string
  onNewPoll?: (poll: Poll) => void
  onPollUpdate?: (pollId: string, updates: Partial<Poll>) => void
  onPollDelete?: (pollId: string) => void
}

interface UsePollFeedRealtimeResult {
  isConnected: boolean
  error: string | null
}

/**
 * Hook to subscribe to real-time updates for polls feed
 * Handles INSERT, UPDATE, and DELETE events on polls table
 */
export function usePollFeedRealtime({
  communityId,
  onNewPoll,
  onPollUpdate,
  onPollDelete,
}: UsePollFeedRealtimeProps): UsePollFeedRealtimeResult {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const callbacksRef = useRef({ onNewPoll, onPollUpdate, onPollDelete })

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = { onNewPoll, onPollUpdate, onPollDelete }
  }, [onNewPoll, onPollUpdate, onPollDelete])

  useEffect(() => {
    const supabase = createClient()

    // Generate subscription key
    const subscriptionKey = generateSubscriptionKey('poll-feed', communityId || 'all')

    try {
      // Create filter for community or all polls
      const filter = communityId ? `community_id=eq.${communityId}` : undefined

      // Create channel using connection manager
      const channel = realtimeConnectionManager.getChannel(subscriptionKey, () => {
        return supabase.channel(subscriptionKey)
      })

      channelRef.current = channel

      // Subscribe to INSERT events (new polls)
      channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'polls',
            filter,
          },
          async (payload) => {
            if (!isPollPayload(payload) || !payload.new) {
              logger.warn('🆕 Invalid poll payload received')
              return
            }
            logger.info('🆕 New poll in feed:', payload.new)
            const newPoll: PollRow = payload.new

            try {
              // Fetch complete poll data with author, options, etc.
              const { data: fullPoll, error: fetchError } = await supabase
                .from('polls')
                .select(
                  `
                  *,
                  author:users!author_id(anonymous_handle, avatar_seed),
                  community:communities(id, name, slug),
                  options:poll_options(*)
                `
                )
                .eq('id', newPoll.id)
                .single()

              if (fetchError) {
                logger.error('Error fetching new poll data:', fetchError)
                return
              }

              if (fullPoll && callbacksRef.current.onNewPoll) {
                // Transform poll options
                const poll: Poll = {
                  ...fullPoll,
                  options: fullPoll.options || [],
                }
                callbacksRef.current.onNewPoll(poll)
              }
            } catch (err) {
              logger.error('Error processing new poll:', err)
            }
          }
        )
        // Subscribe to UPDATE events (poll updates)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'polls',
            filter,
          },
          (payload) => {
            if (!isPollPayload(payload) || !payload.new) {
              logger.warn('🔄 Invalid poll update payload received')
              return
            }
            logger.info('🔄 Poll updated in feed:', payload.new)
            const updatedPoll: PollRow = payload.new

            if (callbacksRef.current.onPollUpdate) {
              callbacksRef.current.onPollUpdate(updatedPoll.id, updatedPoll as Partial<Poll>)
            }
          }
        )
        // Subscribe to DELETE events
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'polls',
            filter,
          },
          (payload) => {
            logger.info('🗑️ Poll deleted from feed:', payload.old.id)
            if (callbacksRef.current.onPollDelete) {
              callbacksRef.current.onPollDelete(payload.old.id)
            }
          }
        )
        .subscribe((status) => {
          logger.info('📡 Poll feed realtime status:', status)
          setIsConnected(status === 'SUBSCRIBED')
          if (status === 'CHANNEL_ERROR') {
            setError('Failed to subscribe to poll feed updates')
          } else {
            setError(null)
          }
        })

      // Cleanup on unmount
      return () => {
        try {
          if (channelRef.current) {
            realtimeConnectionManager.releaseChannel(subscriptionKey, channelRef.current)
          }
        } catch (err) {
          logger.error('Error cleaning up poll feed subscription:', err)
        }
      }
    } catch (err) {
      logger.error('Error setting up poll feed realtime subscription:', err)
      setError(err instanceof Error ? err.message : 'Failed to setup subscription')
      setIsConnected(false)
    }
  }, [communityId])

  return { isConnected, error }
}
