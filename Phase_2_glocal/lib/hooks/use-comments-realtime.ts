'use client'

import { logger } from '@/lib/utils/logger'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { retryWithBackoff } from '@/lib/utils/realtime-connection-manager'
import { RealtimeChannel } from '@supabase/supabase-js'
import { CommentPayload, RealtimeEventQueueItem } from '@/lib/types/realtime.types'
import { MediaItem } from '@/lib/types/media.types'
import { isCommentPayload, isMediaItemPayload } from '@/lib/types/type-guards'

export interface CommentRealtimeData {
  id: string
  post_id: string
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

interface UseCommentsRealtimeResult {
  comments: CommentRealtimeData[]
  isLoading: boolean
  error: string | null
  addComment: (comment: CommentRealtimeData) => void
  updateComment: (commentId: string, updates: Partial<CommentRealtimeData>) => void
  removeComment: (commentId: string) => void
}

export function useCommentsRealtime(
  postId: string,
  initialComments: CommentRealtimeData[] = []
): UseCommentsRealtimeResult {
  const [comments, setComments] = useState<CommentRealtimeData[]>(initialComments)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isSubscribedRef = useRef(false) // Use ref for event handlers to avoid stale closure
  const eventQueueRef = useRef<RealtimeEventQueueItem[]>([]) // Queue for events that arrive before subscription is ready

  useEffect(() => {
    const supabase = createClient()

    logger.info(`🔄 Setting up comment realtime for post: ${postId}`)
    logger.info(`🔄 Initial comments count: ${initialComments.length}`)

    // Reset subscription state
    isSubscribedRef.current = false
    setError(null)
    eventQueueRef.current = [] // Clear event queue on new subscription

    // Helper function to process an INSERT event
    const processInsertEvent = async (payload: CommentPayload) => {
      if (!isCommentPayload(payload) || !payload.new) {
        logger.warn('💬 Invalid comment payload received')
        return
      }
      logger.info('💬 New comment added via realtime:', payload.new)
      const newComment = payload.new

      // CRITICAL: Small delay to ensure transaction is fully committed
      // This prevents race conditions where realtime event arrives before commit
      await new Promise((resolve) => setTimeout(resolve, 100))

      // CRITICAL: Verify this comment is for the correct post
      if (newComment.post_id !== postId) {
        logger.info('💬 Comment is for different post, ignoring:', {
          commentPostId: newComment.post_id,
          currentPostId: postId,
        })
        return
      }

      // Use payload.new directly for basic fields, only fetch author info if needed
      let authorInfo: { anonymous_handle: string; avatar_seed: string } | undefined = undefined
      let mediaItems: MediaItem[] = []
      let userVote: 'upvote' | 'downvote' | null = null

      // Lightweight fetch for author info only (skip if payload has it)
      try {
        const { data: authorData } = await supabase
          .from('users')
          .select('anonymous_handle, avatar_seed')
          .eq('id', newComment.author_id)
          .single()

        if (authorData) {
          authorInfo = {
            anonymous_handle: authorData.anonymous_handle || 'Anonymous',
            avatar_seed: authorData.avatar_seed || '',
          }
        }

        // Fetch media items if needed
        const { data: mediaData } = await supabase
          .from('media_items')
          .select('*')
          .eq('owner_id', newComment.id)
          .eq('owner_type', 'comment')
          .order('display_order', { ascending: true })

        if (mediaData && Array.isArray(mediaData)) {
          mediaItems = mediaData as MediaItem[]
        }

        // Fetch user vote if authenticated
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser()
          if (user) {
            const { data: voteData } = await supabase
              .from('votes')
              .select('vote_type')
              .eq('content_id', newComment.id)
              .eq('content_type', 'comment')
              .eq('user_id', user.id)
              .single()

            if (voteData) {
              userVote = voteData.vote_type as 'upvote' | 'downvote' | null
            }
          }
        } catch (voteError) {
          // Vote fetch is optional, continue without it
          logger.warn('Failed to fetch user vote:', voteError)
        }
      } catch (fetchError) {
        logger.warn('Failed to fetch author/media info, using payload data only:', fetchError)
        // Fallback to anonymous author if fetch fails
        authorInfo = { anonymous_handle: 'Anonymous', avatar_seed: '' }
      }

      // Transform comment using payload data with fetched author info
      const transformedComment: CommentRealtimeData = {
        id: newComment.id,
        post_id: newComment.post_id || postId,
        parent_comment_id: newComment.parent_comment_id || null,
        author_id: newComment.author_id,
        body: newComment.body || '',
        upvotes: newComment.upvotes || 0,
        downvotes: newComment.downvotes || 0,
        is_deleted: newComment.is_deleted || false,
        is_edited: newComment.is_edited || false,
        created_at: newComment.created_at,
        updated_at: newComment.updated_at || newComment.created_at,
        author: authorInfo,
        media_items: mediaItems,
        user_vote: userVote,
      }

      logger.info('💬 Adding new comment to realtime state', {
        commentId: transformedComment.id,
        postId: transformedComment.post_id,
        authorId: transformedComment.author_id,
        body: transformedComment.body?.substring(0, 50),
      })
      setComments((prev) => {
        // Check if comment already exists (prevent duplicates)
        const exists = prev.some((c) => c.id === transformedComment.id)
        if (exists) {
          logger.info(
            '💬 Comment already exists in realtime state, skipping duplicate:',
            transformedComment.id
          )
          return prev
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
          `💬 Updated realtime comment state: ${sortedComments.length} total comments (new: ${transformedComment.id}, parent: ${transformedComment.parent_comment_id})`
        )
        logger.info(
          '💬 Realtime comment IDs:',
          sortedComments.map((c) => c.id)
        )
        return sortedComments
      })
    }

    const setupSubscription = async () => {
      try {
        // Create realtime channel for comments
        // Use unique channel name to avoid conflicts
        const channelName = `comments-${postId}-${Date.now()}`
        const channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'comments',
              filter: `post_id=eq.${postId}`, // Ensure filter matches postId exactly
            },
            async (payload) => {
              // CRITICAL: Queue events that arrive before subscription is ready
              if (!isSubscribedRef.current) {
                logger.warn(
                  '💬 Received INSERT event before subscription ready, queuing...',
                  payload.new?.id
                )
                if (isCommentPayload(payload as unknown as CommentPayload)) {
                  eventQueueRef.current.push({
                    type: 'INSERT',
                    payload: payload as unknown as CommentPayload,
                    timestamp: Date.now(),
                  })
                }
                return
              }

              // Process event immediately if subscription is ready
              try {
                if (isCommentPayload(payload as unknown as CommentPayload)) {
                  await processInsertEvent(payload as unknown as CommentPayload)
                }
              } catch (error) {
                logger.error('❌ Error processing realtime INSERT event:', error)
                // Don't throw - continue processing other events
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'comments',
              filter: `post_id=eq.${postId}`,
            },
            (payload) => {
              // Only process events when subscription is ready
              if (!isSubscribedRef.current) {
                logger.warn('💬 Received UPDATE event before subscription ready')
                return
              }

              if (!isCommentPayload(payload) || !payload.new) {
                logger.warn('💬 Invalid comment update payload received')
                return
              }

              logger.info('📝 Comment updated:', payload.new)
              const updatedComment = payload.new

              setComments((prev) =>
                prev.map((comment) =>
                  comment.id === updatedComment.id ? { ...comment, ...updatedComment } : comment
                )
              )
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'comments',
              filter: `post_id=eq.${postId}`,
            },
            (payload) => {
              // Only process events when subscription is ready
              if (!isSubscribedRef.current) {
                logger.warn('💬 Received DELETE event before subscription ready')
                return
              }

              if (!isCommentPayload(payload) || !payload.old) {
                logger.warn('💬 Invalid comment delete payload received')
                return
              }

              logger.info('🗑️ Comment deleted:', payload.old)
              const deletedComment = payload.old

              setComments((prev) => prev.filter((comment) => comment.id !== deletedComment.id))
            }
          )
          .subscribe(async (status) => {
            logger.info(`💬 Comments realtime status for ${postId}:`, status)

            if (status === 'SUBSCRIBED') {
              isSubscribedRef.current = true
              setIsLoading(false)
              setError(null)
              logger.info(`✅ Successfully subscribed to comments for post: ${postId}`)

              // CRITICAL: Process queued events that arrived before subscription was ready
              if (eventQueueRef.current.length > 0) {
                logger.info(`📦 Processing ${eventQueueRef.current.length} queued events...`)
                const queuedEvents = [...eventQueueRef.current]
                eventQueueRef.current = [] // Clear queue

                // Process each queued event
                for (const queuedEvent of queuedEvents) {
                  if (
                    queuedEvent.type === 'INSERT' &&
                    isCommentPayload(queuedEvent.payload as unknown as CommentPayload)
                  ) {
                    const payload = queuedEvent.payload as unknown as CommentPayload
                    logger.info('📦 Processing queued INSERT event:', payload.new?.id)
                    await processInsertEvent(payload)
                  }
                  // Add other event types (UPDATE, DELETE) if needed
                }
                logger.info(`✅ Processed ${queuedEvents.length} queued events`)
              }
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              logger.warn(`💬 Realtime subscription error: ${status}`)
              isSubscribedRef.current = false
              setError(`Failed to subscribe to comment updates: ${status}`)
              setIsLoading(false)

              // Retry subscription with exponential backoff
              retryTimeoutRef.current = setTimeout(() => {
                logger.info(`🔄 Retrying subscription for post: ${postId}`)
                setupSubscription()
              }, 2000) // Initial retry after 2 seconds
            } else if (status === 'CLOSED') {
              isSubscribedRef.current = false
              logger.info(`🔌 Subscription closed for post: ${postId}`)
            }
          })

        channelRef.current = channel
      } catch (error) {
        logger.error('Error setting up comment realtime subscription:', error)
        setError(error instanceof Error ? error.message : 'Failed to setup subscription')
        setIsLoading(false)

        // Retry with exponential backoff
        retryWithBackoff(
          async () => {
            await setupSubscription()
            return Promise.resolve()
          },
          {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 10000,
          },
          (attempt) => {
            logger.info(`[CommentsRealtime] Retrying subscription setup (attempt ${attempt})...`)
            setError(`Retrying connection... (${attempt}/3)`)
          }
        ).catch(() => {
          setError('Failed to connect after multiple retries')
          setIsLoading(false)
        })
      }
    }

    // Setup subscription
    setupSubscription()

    // Cleanup subscription on unmount
    return () => {
      logger.info(`🔌 Cleaning up comment realtime for post: ${postId}`)
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
      isSubscribedRef.current = false
    }
  }, [postId])

  // Update comments when initialComments change
  // This ensures we show the fetched comments immediately
  // Merge with existing realtime comments to avoid losing updates
  useEffect(() => {
    logger.info(`🔄 Initial comments updated: ${initialComments.length} comments`)

    if (!initialComments || initialComments.length === 0) {
      // If no initial comments, keep existing realtime comments
      return
    }

    setComments((prev) => {
      // Create a map of existing comments by ID
      const existingMap = new Map(prev.map((c) => [c.id, c]))

      // Merge initial comments with existing realtime comments
      // Prefer realtime updates over initial fetch (they're more recent)
      const merged: CommentRealtimeData[] = []
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
        `🔄 Merged comments: ${merged.length} total (${initialComments.length} initial, ${prev.length} existing)`
      )
      return merged
    })

    // Set loading to false immediately when we have initial comments
    setIsLoading(false)
  }, [initialComments])

  // Helper functions for manual comment management
  const addComment = (comment: CommentRealtimeData) => {
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

  const updateComment = (commentId: string, updates: Partial<CommentRealtimeData>) => {
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

// Hook for realtime media attachment notifications
export function useMediaRealtime(ownerId: string, ownerType: 'post' | 'comment' | 'poll_comment') {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    logger.info(`📎 Setting up media realtime for ${ownerType}: ${ownerId}`)

    const channel = supabase
      .channel(`media-${ownerType}-${ownerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'media_items',
          filter: `owner_id=eq.${ownerId}`,
        },
        (payload) => {
          if (!isMediaItemPayload(payload) || !payload.new) {
            logger.warn('📎 Invalid media payload received')
            return
          }
          logger.info('📎 New media attachment:', payload.new)
          const newMedia = payload.new

          if (newMedia.owner_type === ownerType) {
            setMediaItems((prev) => {
              const exists = prev.some((m) => m.id === newMedia.id)
              if (exists) return prev

              return [...prev, newMedia].sort((a, b) => a.display_order - b.display_order)
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'media_items',
          filter: `owner_id=eq.${ownerId}`,
        },
        (payload) => {
          if (!isMediaItemPayload(payload) || !payload.old) {
            logger.warn('📎 Invalid media delete payload received')
            return
          }
          logger.info('🗑️ Media attachment removed:', payload.old)
          const deletedMedia = payload.old

          setMediaItems((prev) => prev.filter((m) => m.id !== deletedMedia.id))
        }
      )
      .subscribe((status) => {
        logger.info(`📎 Media realtime status for ${ownerType}:${ownerId}:`, status)
        if (status === 'SUBSCRIBED') {
          setIsLoading(false)
        }
      })

    return () => {
      logger.info(`🔌 Cleaning up media realtime for ${ownerType}: ${ownerId}`)
      supabase.removeChannel(channel)
    }
  }, [ownerId, ownerType])

  return { mediaItems, isLoading }
}

// Connection pool manager for multiple realtime subscriptions
class RealtimeConnectionPool {
  private connections = new Map<string, RealtimeChannel>()
  private connectionCounts = new Map<string, number>()

  getConnection(key: string, createFn: () => RealtimeChannel): RealtimeChannel {
    if (!this.connections.has(key)) {
      logger.info(`🔌 Creating new realtime connection: ${key}`)
      this.connections.set(key, createFn())
      this.connectionCounts.set(key, 1)
    } else {
      const count = this.connectionCounts.get(key) || 0
      this.connectionCounts.set(key, count + 1)
      logger.info(`🔌 Reusing realtime connection: ${key} (${count + 1} subscribers)`)
    }

    const connection = this.connections.get(key)
    if (!connection) {
      throw new Error(`Connection not found for key: ${key}`)
    }
    return connection
  }

  releaseConnection(key: string, cleanup: (connection: RealtimeChannel) => void) {
    const count = this.connectionCounts.get(key) || 0

    if (count <= 1) {
      logger.info(`🔌 Closing realtime connection: ${key}`)
      const connection = this.connections.get(key)
      if (connection) {
        cleanup(connection)
      }
      this.connections.delete(key)
      this.connectionCounts.delete(key)
    } else {
      this.connectionCounts.set(key, count - 1)
      logger.info(`🔌 Released realtime connection: ${key} (${count - 1} remaining)`)
    }
  }
}

export const realtimePool = new RealtimeConnectionPool()
