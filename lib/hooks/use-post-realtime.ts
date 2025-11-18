'use client'

import { logger } from '@/lib/utils/logger'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isPostPayload } from '@/lib/types/type-guards'

interface PostRealtimeData {
  upvotes: number
  downvotes: number
  view_count: number
  comment_count: number
  media_count: number
}

interface UsePostRealtimeResult {
  data: PostRealtimeData | null
  isLoading: boolean
  error: string | null
}

export function usePostRealtime(
  postId: string,
  initialData?: Partial<PostRealtimeData>
): UsePostRealtimeResult {
  const [data, setData] = useState<PostRealtimeData | null>(
    initialData
      ? {
          upvotes: initialData.upvotes || 0,
          downvotes: initialData.downvotes || 0,
          view_count: initialData.view_count || 0,
          comment_count: initialData.comment_count || 0,
          media_count: initialData.media_count || 0,
        }
      : null
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isSubscribedRef = useRef(false) // Use ref for event handlers to avoid stale closure

  useEffect(() => {
    try {
      const supabase = createClient()

      // Reset subscription state
      isSubscribedRef.current = false
      setError(null)

      // Subscribe to post changes
      const channel = supabase
        .channel(`post-${postId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'posts',
            filter: `id=eq.${postId}`,
          },
          (payload) => {
            // Only process events when subscription is ready
            if (!isSubscribedRef.current) {
              logger.warn('📝 Received INSERT event before subscription ready')
              return
            }

            if (!isPostPayload(payload) || !payload.new) {
              logger.warn('📝 Invalid post payload received')
              return
            }
            logger.info('🆕 New post created:', payload.new)
            const newPost = payload.new

            // Update data with new post info
            setData((prev) => ({
              upvotes: newPost.upvotes ?? prev?.upvotes ?? 0,
              downvotes: newPost.downvotes ?? prev?.downvotes ?? 0,
              view_count: newPost.view_count ?? prev?.view_count ?? 0,
              comment_count: newPost.comment_count ?? prev?.comment_count ?? 0,
              media_count: newPost.media_count ?? prev?.media_count ?? 0,
            }))
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'posts',
            filter: `id=eq.${postId}`,
          },
          (payload) => {
            // Only process events when subscription is ready
            if (!isSubscribedRef.current) {
              logger.warn('📝 Received UPDATE event before subscription ready')
              return
            }

            if (!isPostPayload(payload) || !payload.new) {
              logger.warn('📝 Invalid post update payload received')
              return
            }
            logger.info('🔄 Post updated:', payload.new)
            const newData = payload.new
            setData((prev) => ({
              upvotes: newData.upvotes ?? prev?.upvotes ?? 0,
              downvotes: newData.downvotes ?? prev?.downvotes ?? 0,
              view_count: newData.view_count ?? prev?.view_count ?? 0,
              comment_count: newData.comment_count ?? prev?.comment_count ?? 0,
              media_count: newData.media_count ?? prev?.media_count ?? 0,
            }))
          }
        )
        .subscribe((status) => {
          logger.info(`📝 Post realtime status for ${postId}:`, status)

          if (status === 'SUBSCRIBED') {
            isSubscribedRef.current = true
            setIsLoading(false)
            setError(null)
            logger.info(`✅ Successfully subscribed to post updates for: ${postId}`)
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            logger.warn(`📝 Post realtime subscription error: ${status}`)
            isSubscribedRef.current = false
            setError(`Failed to subscribe to post updates: ${status}`)
            setIsLoading(false)
          } else if (status === 'CLOSED') {
            isSubscribedRef.current = false
            logger.info(`🔌 Post subscription closed for: ${postId}`)
          }
        })

      // Cleanup subscription on unmount
      return () => {
        try {
          supabase.removeChannel(channel)
          isSubscribedRef.current = false
        } catch (cleanupError) {
          logger.error('Error cleaning up post realtime subscription:', cleanupError)
        }
      }
    } catch (error) {
      logger.error('Error initializing post realtime subscription:', error)
      setError(error instanceof Error ? error.message : 'Failed to initialize realtime updates')
      setIsLoading(false)
      isSubscribedRef.current = false
    }
  }, [postId])

  return { data, isLoading, error }
}
