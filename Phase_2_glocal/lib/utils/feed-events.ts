/**
 * Feed refresh event system
 * Allows components to notify feed components to refresh their data
 */

import { useEffect } from 'react'

// Custom event name for feed refresh
export const FEED_REFRESH_EVENT = 'feed-refresh'

/**
 * Emit a feed refresh event to trigger all feeds to refetch their data
 */
export function emitFeedRefresh() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(FEED_REFRESH_EVENT))
  }
}

/**
 * Hook to listen for feed refresh events and call a callback
 */
export function useFeedRefresh(callback: () => void) {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleRefresh = () => {
      callback()
    }

    window.addEventListener(FEED_REFRESH_EVENT, handleRefresh)

    return () => {
      window.removeEventListener(FEED_REFRESH_EVENT, handleRefresh)
    }
  }, [callback])
}
