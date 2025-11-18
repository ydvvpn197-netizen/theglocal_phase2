'use client'

import { logger } from '@/lib/utils/logger'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  realtimeConnectionManager,
  generateSubscriptionKey,
  retryWithBackoff,
} from '@/lib/utils/realtime-connection-manager'
import { RealtimeChannel } from '@supabase/supabase-js'
import { MediaItem } from '@/lib/types/media.types'
import { isPostPayload } from '@/lib/types/type-guards'

interface PostData {
  id: string
  community_id?: string
  author_id?: string
  title?: string
  body?: string | null
  external_url?: string | null
  media_count?: number
  location_city?: string | null
  upvotes?: number
  downvotes?: number
  comment_count?: number
  view_count?: number
  is_deleted?: boolean
  is_edited?: boolean
  is_pinned?: boolean
  is_announcement?: boolean
  created_at?: string
  user_vote?: 'upvote' | 'downvote' | null
  distance_km?: number
  media_items?: MediaItem[]
  author?: {
    anonymous_handle: string
    avatar_seed: string
  }
  community?: {
    id: string
    name: string
    slug: string
  }
}

interface UseFeedRealtimeProps {
  communityId?: string
  onNewPost?: (post: PostData) => void
  onPostUpdate?: (postId: string, updates: Partial<PostData>) => void
  onPostDelete?: (postId: string) => void
}

interface UseFeedRealtimeResult {
  isConnected: boolean
  error: string | null
}

/**
 * Hook to subscribe to real-time updates for posts feed
 * Handles INSERT, UPDATE, and DELETE events on posts table
 */
export function useFeedRealtime({
  communityId,
  onNewPost,
  onPostUpdate,
  onPostDelete,
}: UseFeedRealtimeProps): UseFeedRealtimeResult {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const callbacksRef = useRef({ onNewPost, onPostUpdate, onPostDelete })
  const isSubscribedRef = useRef(false) // Use ref for event handlers to avoid stale closure

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = { onNewPost, onPostUpdate, onPostDelete }
  }, [onNewPost, onPostUpdate, onPostDelete])

  useEffect(() => {
    const supabase = createClient()

    // Generate subscription key
    const subscriptionKey = generateSubscriptionKey('feed', communityId || 'all')

    try {
      // Create filter for community or all posts
      const filter = communityId ? `community_id=eq.${communityId}` : undefined

      // Create channel using connection manager
      const channel = realtimeConnectionManager.getChannel(subscriptionKey, () => {
        return supabase.channel(subscriptionKey)
      })

      channelRef.current = channel

      // Reset subscription state
      isSubscribedRef.current = false

      // Subscribe to INSERT events (new posts)
      channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'posts',
            filter,
          },
          async (payload) => {
            // Only process events when subscription is ready
            if (!isSubscribedRef.current) {
              logger.warn('🆕 Received INSERT event before subscription ready')
              return
            }

            if (!isPostPayload(payload) || !payload.new) {
              logger.warn('🆕 Invalid post payload received')
              return
            }
            logger.info('🆕 New post in feed:', payload.new)
            const newPost = payload.new

            // Skip if post is deleted or not accessible
            if (newPost.is_deleted) return

            try {
              // Use payload.new directly for basic fields, fetch author/community/media only
              // This is faster than fetching everything
              const postData: PostData = {
                ...newPost,
                author: undefined,
                community: undefined,
                media_items: [],
              }

              // Fetch author info (lightweight)
              try {
                const { data: authorData } = await supabase
                  .from('users')
                  .select('anonymous_handle, avatar_seed')
                  .eq('id', newPost.author_id)
                  .single()

                if (authorData) {
                  postData.author = {
                    anonymous_handle: authorData.anonymous_handle || 'Anonymous',
                    avatar_seed: authorData.avatar_seed || '',
                  }
                }
              } catch (authorError) {
                logger.warn('Failed to fetch author info, using payload data:', authorError)
                postData.author = { anonymous_handle: 'Anonymous', avatar_seed: '' }
              }

              // Fetch community info if needed
              if (newPost.community_id) {
                try {
                  const { data: communityData } = await supabase
                    .from('communities')
                    .select('id, name, slug')
                    .eq('id', newPost.community_id)
                    .single()

                  if (communityData) {
                    postData.community = communityData
                  }
                } catch (communityError) {
                  logger.warn('Failed to fetch community info:', communityError)
                }
              }

              // Fetch media items if needed
              try {
                const { data: mediaData } = await supabase
                  .from('media_items')
                  .select('*')
                  .eq('owner_id', newPost.id)
                  .eq('owner_type', 'post')
                  .order('display_order', { ascending: true })

                if (mediaData && Array.isArray(mediaData)) {
                  postData.media_items = mediaData as MediaItem[]
                  postData.media_count = mediaData.length
                }
              } catch (mediaError) {
                logger.warn('Failed to fetch media items:', mediaError)
              }

              // Call callback with complete post data
              if (callbacksRef.current.onNewPost) {
                callbacksRef.current.onNewPost(postData)
              }
            } catch (err) {
              logger.error('Error processing new post:', err)
              // Fallback: try to use payload data directly even if fetch fails
              if (callbacksRef.current.onNewPost) {
                try {
                  const fallbackPost: PostData = {
                    ...newPost,
                    author: { anonymous_handle: 'Anonymous', avatar_seed: '' },
                    media_items: [],
                  }
                  callbacksRef.current.onNewPost(fallbackPost)
                } catch (fallbackError) {
                  logger.error('Error in fallback post processing:', fallbackError)
                }
              }
            }
          }
        )
        // Subscribe to UPDATE events (post updates)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'posts',
            filter,
          },
          (payload) => {
            // Only process events when subscription is ready
            if (!isSubscribedRef.current) {
              logger.warn('🔄 Received UPDATE event before subscription ready')
              return
            }

            if (!isPostPayload(payload) || !payload.new) {
              logger.warn('🔄 Invalid post update payload received')
              return
            }
            logger.info('🔄 Post updated in feed:', payload.new)
            const updatedPost = payload.new

            // If post was soft-deleted, treat as delete
            if (updatedPost.is_deleted && callbacksRef.current.onPostDelete) {
              callbacksRef.current.onPostDelete(updatedPost.id)
              return
            }

            if (callbacksRef.current.onPostUpdate) {
              callbacksRef.current.onPostUpdate(updatedPost.id, updatedPost as Partial<PostData>)
            }
          }
        )
        // Subscribe to DELETE events (hard deletes)
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'posts',
            filter,
          },
          (payload) => {
            // Only process events when subscription is ready
            if (!isSubscribedRef.current) {
              logger.warn('🗑️ Received DELETE event before subscription ready')
              return
            }

            if (!isPostPayload(payload) || !payload.old) {
              logger.warn('🗑️ Invalid post delete payload received')
              return
            }
            logger.info('🗑️ Post deleted from feed:', payload.old.id)
            if (callbacksRef.current.onPostDelete) {
              callbacksRef.current.onPostDelete(payload.old.id)
            }
          }
        )
        .subscribe((status) => {
          logger.info('📡 Feed realtime status:', status)

          if (status === 'SUBSCRIBED') {
            isSubscribedRef.current = true
            setIsConnected(true)
            setError(null)
            logger.info('✅ Successfully subscribed to feed updates')
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            logger.warn(`📡 Feed realtime subscription error: ${status}`)
            isSubscribedRef.current = false
            setIsConnected(false)
            setError(`Failed to subscribe to feed updates: ${status}`)
          } else if (status === 'CLOSED') {
            isSubscribedRef.current = false
            setIsConnected(false)
            logger.info('🔌 Feed subscription closed')
          } else {
            setIsConnected(status === 'SUBSCRIBED')
            if (status === 'CHANNEL_ERROR') {
              setError('Failed to subscribe to feed updates')
            } else {
              setError(null)
            }
          }
        })

      // Cleanup on unmount
      return () => {
        try {
          if (channelRef.current) {
            realtimeConnectionManager.releaseChannel(subscriptionKey, channelRef.current)
          }
          isSubscribedRef.current = false
        } catch (err) {
          logger.error('Error cleaning up feed subscription:', err)
        }
      }
    } catch (err) {
      logger.error('Error setting up feed realtime subscription:', err)
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
          logger.info(`[FeedRealtime] Retrying subscription setup (attempt ${attempt})...`)
          setError(`Retrying connection... (${attempt}/${retryConfig.maxRetries})`)
        }
      ).catch(() => {
        setError('Failed to connect after multiple retries')
      })
    }
  }, [communityId])

  return { isConnected, error }
}
