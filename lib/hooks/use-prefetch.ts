/**
 * Prefetching Hooks
 *
 * React hooks that make it easy to prefetch data on hover, focus, or other events.
 */

'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'
import {
  prefetchUserProfile,
  prefetchPost,
  prefetchCommunity,
  prefetchEvent,
  prefetchArtist,
} from '@/lib/utils/prefetch'

/**
 * Prefetch on hover
 * Usage: <Link {...usePrefetchOnHover(() => prefetchPost(queryClient, postId))} />
 */
export function usePrefetchOnHover(prefetchFn: () => Promise<void>) {
  const timeoutRef = useRef<NodeJS.Timeout>()
  const hasPrefetchedRef = useRef(false)

  const handleMouseEnter = useCallback(() => {
    if (hasPrefetchedRef.current) return

    // Delay prefetch by 100ms to avoid prefetching on quick hovers
    timeoutRef.current = setTimeout(() => {
      prefetchFn()
      hasPrefetchedRef.current = true
    }, 100)
  }, [prefetchFn])

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [])

  return {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
  }
}

/**
 * Prefetch on focus
 * Usage: <Link {...usePrefetchOnFocus(() => prefetchPost(queryClient, postId))} />
 */
export function usePrefetchOnFocus(prefetchFn: () => Promise<void>) {
  const hasPrefetchedRef = useRef(false)

  const handleFocus = useCallback(() => {
    if (hasPrefetchedRef.current) return

    prefetchFn()
    hasPrefetchedRef.current = true
  }, [prefetchFn])

  return {
    onFocus: handleFocus,
  }
}

/**
 * Prefetch on viewport intersection (when element becomes visible)
 * Usage: const ref = usePrefetchOnVisible(() => prefetchPost(queryClient, postId))
 */
export function usePrefetchOnVisible(
  prefetchFn: () => Promise<void>,
  options?: IntersectionObserverInit
) {
  const ref = useRef<HTMLElement>(null)
  const hasPrefetchedRef = useRef(false)

  useEffect(() => {
    const element = ref.current
    if (!element || hasPrefetchedRef.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.isIntersecting && !hasPrefetchedRef.current) {
          prefetchFn()
          hasPrefetchedRef.current = true
          observer.disconnect()
        }
      },
      {
        rootMargin: '50px', // Prefetch 50px before element is visible
        ...options,
      }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [prefetchFn, options])

  return ref
}

/**
 * Prefetch user profile on hover
 */
export function usePrefetchUser(userId: string) {
  const queryClient = useQueryClient()

  return usePrefetchOnHover(
    useCallback(async () => {
      await prefetchUserProfile(queryClient, userId)
    }, [queryClient, userId])
  )
}

/**
 * Prefetch post on hover
 */
export function usePrefetchPost(postId: string) {
  const queryClient = useQueryClient()

  return usePrefetchOnHover(
    useCallback(async () => {
      await prefetchPost(queryClient, postId)
    }, [queryClient, postId])
  )
}

/**
 * Prefetch community on hover
 */
export function usePrefetchCommunity(communityId: string) {
  const queryClient = useQueryClient()

  return usePrefetchOnHover(
    useCallback(async () => {
      await prefetchCommunity(queryClient, communityId)
    }, [queryClient, communityId])
  )
}

/**
 * Prefetch event on hover
 */
export function usePrefetchEvent(eventId: string) {
  const queryClient = useQueryClient()

  return usePrefetchOnHover(
    useCallback(async () => {
      await prefetchEvent(queryClient, eventId)
    }, [queryClient, eventId])
  )
}

/**
 * Prefetch artist on hover
 */
export function usePrefetchArtist(artistId: string) {
  const queryClient = useQueryClient()

  return usePrefetchOnHover(
    useCallback(async () => {
      await prefetchArtist(queryClient, artistId)
    }, [queryClient, artistId])
  )
}

/**
 * Prefetch next page when scrolling near bottom
 */
export function usePrefetchNextPage(
  prefetchFn: () => Promise<void>,
  threshold = 0.8 // Trigger when 80% scrolled
) {
  const hasTriggeredRef = useRef(false)

  useEffect(() => {
    const handleScroll = () => {
      if (hasTriggeredRef.current) return

      const scrollPosition = window.scrollY + window.innerHeight
      const totalHeight = document.documentElement.scrollHeight
      const scrollPercentage = scrollPosition / totalHeight

      if (scrollPercentage >= threshold) {
        prefetchFn()
        hasTriggeredRef.current = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [prefetchFn, threshold])
}

/**
 * Prefetch on route change (for Next.js navigation)
 */
export function usePrefetchRoute(href: string, prefetchFn: () => Promise<void>) {
  // const _queryClient = useQueryClient() // Reserved for future use
  const hasPrefetchedRef = useRef(false)

  useEffect(() => {
    // Reset prefetch flag when href changes
    hasPrefetchedRef.current = false
  }, [href])

  return usePrefetchOnHover(
    useCallback(async () => {
      if (hasPrefetchedRef.current) return

      await prefetchFn()
      hasPrefetchedRef.current = true
    }, [prefetchFn])
  )
}
