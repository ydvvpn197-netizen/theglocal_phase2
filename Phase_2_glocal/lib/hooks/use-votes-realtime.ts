'use client'

import { logger } from '@/lib/utils/logger'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  realtimeConnectionManager,
  generateSubscriptionKey,
} from '@/lib/utils/realtime-connection-manager'
import { RealtimeChannel } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

interface UseVotesRealtimeProps {
  contentType: 'post' | 'comment' | 'poll'
  contentId: string
  onVoteChange?: (
    upvotes: number,
    downvotes: number,
    userVote: 'upvote' | 'downvote' | null
  ) => void
}

interface UseVotesRealtimeResult {
  isConnected: boolean
  error: string | null
  upvotes: number
  downvotes: number
  userVote: 'upvote' | 'downvote' | null
}

/**
 * Hook to subscribe to real-time updates for votes
 * Handles INSERT, UPDATE, and DELETE events on votes table
 * Recalculates vote counts and provides current user's vote
 */
export function useVotesRealtime({
  contentType,
  contentId,
  onVoteChange,
}: UseVotesRealtimeProps): UseVotesRealtimeResult {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [upvotes, setUpvotes] = useState(0)
  const [downvotes, setDownvotes] = useState(0)
  const [userVote, setUserVote] = useState<'upvote' | 'downvote' | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const callbackRef = useRef(onVoteChange)
  const isRecalculatingRef = useRef(false)

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = onVoteChange
  }, [onVoteChange])

  // Recalculate vote counts
  const recalculateVotes = async (supabase: SupabaseClient) => {
    if (isRecalculatingRef.current) return
    isRecalculatingRef.current = true

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // Count upvotes
      const { count: upvoteCount, error: upvoteError } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('content_type', contentType)
        .eq('content_id', contentId)
        .eq('vote_type', 'upvote')

      if (upvoteError) {
        logger.error('Error counting upvotes:', upvoteError)
        return
      }

      // Count downvotes
      const { count: downvoteCount, error: downvoteError } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('content_type', contentType)
        .eq('content_id', contentId)
        .eq('vote_type', 'downvote')

      if (downvoteError) {
        logger.error('Error counting downvotes:', downvoteError)
        return
      }

      // Get user's current vote
      let currentUserVote: 'upvote' | 'downvote' | null = null
      if (user) {
        const { data: userVoteData } = await supabase
          .from('votes')
          .select('vote_type')
          .eq('content_type', contentType)
          .eq('content_id', contentId)
          .eq('user_id', user.id)
          .single()

        if (userVoteData) {
          currentUserVote = userVoteData.vote_type as 'upvote' | 'downvote'
        }
      }

      // Update state
      setUpvotes(upvoteCount || 0)
      setDownvotes(downvoteCount || 0)
      setUserVote(currentUserVote)

      // Call callback
      if (callbackRef.current) {
        callbackRef.current(upvoteCount || 0, downvoteCount || 0, currentUserVote)
      }
    } catch (err) {
      logger.error('Error recalculating votes:', err)
    } finally {
      isRecalculatingRef.current = false
    }
  }

  useEffect(() => {
    const supabase = createClient()

    // Generate subscription key
    const subscriptionKey = generateSubscriptionKey('votes', contentType, contentId)

    try {
      // Create filter for this specific content
      const filter = `content_type=eq.${contentType}&content_id=eq.${contentId}`

      // Initial vote count fetch
      recalculateVotes(supabase)

      // Create channel using connection manager
      const channel = realtimeConnectionManager.getChannel(subscriptionKey, () => {
        return supabase.channel(subscriptionKey)
      })

      channelRef.current = channel

      // Subscribe to all vote changes (INSERT, UPDATE, DELETE)
      channel
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'votes',
            filter,
          },
          (payload) => {
            logger.info(`🗳️ Vote ${payload.eventType} for ${contentType}:${contentId}:`, payload)
            // Recalculate vote counts after any change
            recalculateVotes(supabase)
          }
        )
        .subscribe((status) => {
          logger.info(`📡 Votes realtime status for ${contentType}:${contentId}:`, status)
          setIsConnected(status === 'SUBSCRIBED')
          if (status === 'CHANNEL_ERROR') {
            setError('Failed to subscribe to vote updates')
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
          logger.error('Error cleaning up votes subscription:', err)
        }
      }
    } catch (err) {
      logger.error('Error setting up votes realtime subscription:', err)
      setError(err instanceof Error ? err.message : 'Failed to setup subscription')
      setIsConnected(false)
    }
  }, [contentType, contentId])

  return { isConnected, error, upvotes, downvotes, userVote }
}
