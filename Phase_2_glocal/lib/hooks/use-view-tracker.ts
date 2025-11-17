'use client'

import { logger } from '@/lib/utils/logger'
import { useEffect, useState } from 'react'

interface ViewTrackerResult {
  viewCount: number
  isTracking: boolean
  error: string | null
}

export function useViewTracker(postId: string): ViewTrackerResult {
  const [viewCount, setViewCount] = useState(0)
  const [isTracking, setIsTracking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const trackView = async () => {
      // Skip if already tracked in this session
      const sessionKey = `view_tracked_${postId}`
      if (sessionStorage.getItem(sessionKey)) {
        return
      }

      setIsTracking(true)
      setError(null)

      try {
        // Generate or retrieve session ID
        let sessionId = sessionStorage.getItem('session_id')
        if (!sessionId) {
          sessionId = crypto.randomUUID()
          sessionStorage.setItem('session_id', sessionId)
        }

        const response = await fetch(`/api/posts/${postId}/view`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ session_id: sessionId }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to track view')
        }

        const data = await response.json()
        setViewCount(data.data.view_count)

        // Mark as tracked for this session
        sessionStorage.setItem(sessionKey, 'true')
      } catch (err) {
        logger.error('View tracking error:', err)
        setError(err instanceof Error ? err.message : 'Failed to track view')
      } finally {
        setIsTracking(false)
      }
    }

    trackView()
  }, [postId])

  return { viewCount, isTracking, error }
}
