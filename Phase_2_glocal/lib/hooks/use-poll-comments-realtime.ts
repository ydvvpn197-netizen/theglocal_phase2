'use client'

import { logger } from '@/lib/utils/logger'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  realtimeConnectionManager,
  generateSubscriptionKey,
} from '@/lib/utils/realtime-connection-manager'
import { RealtimeChannel } from '@supabase/supabase-js'
import { PollCommentRow } from '@/lib/types/realtime.types'
import { MediaItem } from '@/lib/types/media.types'
import { isPollCommentPayload } from '@/lib/types/type-guards'

interface PollCommentRealtimeData {
  id: string
  poll_id: string
  parent_comment_id: string | null
  author_id: string
  body: string
  upvotes: number
  downvotes: number
  is_deleted: boolean
  is_edited: boolean
  created_at: string
  updated_at: string
  author?: {
    anonymous_handle: string
    avatar_seed: string
  }
  media_items?: MediaItem[]
  user_vote?: 'upvote' | 'downvote' | null
}

interface UsePollCommentsRealtimeResult {
  comments: PollCommentRealtimeData[]
  isLoading: boolean
  error: string | null
  addComment: (comment: PollCommentRealtimeData) => void
  updateComment: (commentId: string, updates: Partial<PollCommentRealtimeData>) => void
  removeComment: (commentId: string) => void
}

/**
 * Hook to subscribe to real-time updates for poll comments
 * Handles INSERT, UPDATE, and DELETE events on poll_comments table
 */
export function usePollCommentsRealtime(
  pollId: string,
  initialComments: PollCommentRealtimeData[] = []
): UsePollCommentsRealtimeResult {
  const [comments, setComments] = useState<PollCommentRealtimeData[]>(initialComments)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    const supabase = createClient()

    logger.info(`🔄 Setting up poll comment realtime for poll: ${pollId}`)
    logger.info(`🔄 Initial poll comments count: ${initialComments.length}`)

    // Don't block on realtime subscription - set loading to false immediately
    setIsLoading(false)

    // Generate subscription key
    const subscriptionKey = generateSubscriptionKey('poll-comments', pollId)

    // Create filter for this specific poll
    const filter = `poll_id=eq.${pollId}`

    try {
      // Create channel using connection manager
      const channel = realtimeConnectionManager.getChannel(subscriptionKey, () => {
        return supabase.channel(subscriptionKey)
      })

      channelRef.current = channel

      // Subscribe to INSERT events (new poll comments)
      channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'poll_comments',
            filter,
          },
          async (payload) => {
            if (!isPollCommentPayload(payload) || !payload.new) {
              logger.warn('💬 Invalid poll comment payload received')
              return
            }
            logger.info('💬 New poll comment added:', payload.new)
            const newComment: PollCommentRow = payload.new

            try {
              // Fetch complete comment data with author info
              const {
                data: { user },
              } = await supabase.auth.getUser()

              // Fetch comment with author and media
              const { data: commentWithAuthor, error: fetchError } = await supabase
                .from('poll_comments')
                .select(
                  `
                  *,
                  author:users!author_id(anonymous_handle, avatar_seed),
                  media_items:media_items(*)
                `
                )
                .eq('id', newComment.id)
                .single()

              if (fetchError) {
                logger.error('Error fetching new poll comment data:', fetchError)
                return
              }

              // Get user's vote if authenticated
              let userVote: 'upvote' | 'downvote' | null = null
              if (user) {
                const { data: voteData } = await supabase
                  .from('votes')
                  .select('vote_type')
                  .eq('content_type', 'comment')
                  .eq('content_id', newComment.id)
                  .eq('user_id', user.id)
                  .single()

                if (voteData) {
                  userVote = voteData.vote_type as 'upvote' | 'downvote'
                }
              }

              if (commentWithAuthor) {
                logger.info('💬 Adding new poll comment to realtime state:', commentWithAuthor.id)
                setComments((prev) => {
                  // Check if comment already exists (prevent duplicates)
                  const exists = prev.some((c) => c.id === commentWithAuthor.id)
                  if (exists) {
                    logger.info(
                      '💬 Poll comment already exists, skipping duplicate:',
                      commentWithAuthor.id
                    )
                    return prev
                  }

                  // Transform comment to match expected format
                  const transformedComment: PollCommentRealtimeData = {
                    id: commentWithAuthor.id,
                    poll_id: commentWithAuthor.poll_id || pollId,
                    parent_comment_id: commentWithAuthor.parent_comment_id || null,
                    author_id: commentWithAuthor.author_id,
                    body: commentWithAuthor.body || '',
                    upvotes: commentWithAuthor.upvotes || 0,
                    downvotes: commentWithAuthor.downvotes || 0,
                    is_deleted: commentWithAuthor.is_deleted || false,
                    is_edited: commentWithAuthor.is_edited || false,
                    created_at: commentWithAuthor.created_at,
                    updated_at: commentWithAuthor.updated_at || commentWithAuthor.created_at,
                    author: commentWithAuthor.author || {
                      anonymous_handle: 'Anonymous',
                      avatar_seed: '',
                    },
                    media_items: commentWithAuthor.media_items || [],
                    user_vote: userVote,
                  }

                  // Add to the appropriate position in the thread
                  const newComments = [...prev, transformedComment]

                  // Sort comments: top-level first, then by creation time
                  const sortedComments = newComments.sort((a, b) => {
                    // Top-level comments first
                    if (!a.parent_comment_id && b.parent_comment_id) return -1
                    if (a.parent_comment_id && !b.parent_comment_id) return 1

                    // Same level, sort by creation time
                    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                  })

                  logger.info(
                    `💬 Updated poll comment state: ${sortedComments.length} total comments (new: ${transformedComment.id}, parent: ${transformedComment.parent_comment_id})`
                  )
                  return sortedComments
                })
              } else {
                logger.warn('💬 Failed to fetch complete poll comment data for:', newComment.id)
              }
            } catch (err) {
              logger.error('Error processing new poll comment:', err)
            }
          }
        )
        // Subscribe to UPDATE events (poll comment updates)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'poll_comments',
            filter,
          },
          (payload) => {
            logger.info('📝 Poll comment updated:', payload.new)
            if (!isPollCommentPayload(payload) || !payload.new) {
              logger.warn('💬 Invalid poll comment update payload received')
              return
            }
            const updatedComment: PollCommentRow = payload.new

            setComments((prev) =>
              prev.map((comment) =>
                comment.id === updatedComment.id ? { ...comment, ...updatedComment } : comment
              )
            )
          }
        )
        // Subscribe to DELETE events (hard deletes)
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'poll_comments',
            filter,
          },
          (payload) => {
            logger.info('🗑️ Poll comment deleted:', payload.old)
            if (!isPollCommentPayload(payload) || !payload.old) {
              logger.warn('💬 Invalid poll comment delete payload received')
              return
            }
            const deletedComment: PollCommentRow = payload.old

            setComments((prev) => prev.filter((comment) => comment.id !== deletedComment.id))
          }
        )
        .subscribe((status) => {
          logger.info(`💬 Poll comments realtime status for ${pollId}:`, status)

          if (status === 'CHANNEL_ERROR') {
            logger.warn('💬 Realtime subscription error (non-fatal):', status)
            setError('Failed to subscribe to poll comment updates (comments will still work)')
          } else {
            setError(null)
          }
        })

      // Cleanup subscription on unmount
      return () => {
        logger.info(`🔌 Cleaning up poll comment realtime for poll: ${pollId}`)
        try {
          if (channelRef.current) {
            realtimeConnectionManager.releaseChannel(subscriptionKey, channelRef.current)
          }
        } catch (err) {
          logger.error('Error cleaning up poll comment subscription:', err)
        }
      }
    } catch (err) {
      logger.error('Error setting up poll comment realtime subscription:', err)
      setError(err instanceof Error ? err.message : 'Failed to setup subscription')
      setIsLoading(false)
    }
  }, [pollId])

  // Update comments when initialComments change
  // This ensures we show the fetched comments immediately
  // Merge with existing realtime comments to avoid losing updates
  useEffect(() => {
    logger.info(`🔄 Initial poll comments updated: ${initialComments.length} comments`)

    if (!initialComments || initialComments.length === 0) {
      // If no initial comments, keep existing realtime comments
      return
    }

    setComments((prev) => {
      // Create a map of existing comments by ID
      const existingMap = new Map(prev.map((c) => [c.id, c]))

      // Merge initial comments with existing realtime comments
      // Prefer realtime updates over initial fetch (they're more recent)
      const merged: PollCommentRealtimeData[] = []
      const processedIds = new Set<string>()

      // First, add all initial comments
      initialComments.forEach((comment) => {
        if (comment && comment.id) {
          // Use existing realtime version if available (more recent), otherwise use initial
          const existing = existingMap.get(comment.id)
          merged.push(existing || comment)
          processedIds.add(comment.id)
        }
      })

      // Then, add any realtime comments that aren't in initial comments
      prev.forEach((comment) => {
        if (comment && comment.id && !processedIds.has(comment.id)) {
          merged.push(comment)
          processedIds.add(comment.id)
        }
      })

      // Sort merged comments
      merged.sort((a, b) => {
        // Top-level comments first
        if (!a.parent_comment_id && b.parent_comment_id) return -1
        if (a.parent_comment_id && !b.parent_comment_id) return 1
        // Same level, sort by creation time
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })

      logger.info(
        `🔄 Merged poll comments: ${merged.length} total (${initialComments.length} initial, ${prev.length} existing)`
      )
      return merged
    })

    // Set loading to false immediately when we have initial comments
    setIsLoading(false)
  }, [initialComments])

  // Helper functions for manual comment management
  const addComment = (comment: PollCommentRealtimeData) => {
    setComments((prev) => {
      const exists = prev.some((c) => c.id === comment.id)
      if (exists) return prev

      const newComments = [...prev, comment]
      return newComments.sort((a, b) => {
        if (!a.parent_comment_id && b.parent_comment_id) return -1
        if (a.parent_comment_id && !b.parent_comment_id) return 1
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })
    })
  }

  const updateComment = (commentId: string, updates: Partial<PollCommentRealtimeData>) => {
    setComments((prev) =>
      prev.map((comment) => (comment.id === commentId ? { ...comment, ...updates } : comment))
    )
  }

  const removeComment = (commentId: string) => {
    setComments((prev) => prev.filter((comment) => comment.id !== commentId))
  }

  return {
    comments,
    isLoading,
    error,
    addComment,
    updateComment,
    removeComment,
  }
}
