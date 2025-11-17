/**
 * Query Prefetching Utilities
 *
 * Prefetch data before it's needed to improve perceived performance.
 * Useful for navigation transitions, hover states, and predictable user flows.
 */

import { QueryClient } from '@tanstack/react-query'

/**
 * Prefetch user profile data
 */
export async function prefetchUserProfile(queryClient: QueryClient, userId: string) {
  await queryClient.prefetchQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}`)
      if (!response.ok) throw new Error('Failed to fetch user')
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Prefetch user posts
 */
export async function prefetchUserPosts(queryClient: QueryClient, userId: string, limit = 10) {
  await queryClient.prefetchQuery({
    queryKey: ['user', userId, 'posts', { limit }],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}/posts?limit=${limit}`)
      if (!response.ok) throw new Error('Failed to fetch posts')
      return response.json()
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Prefetch post details and comments
 */
export async function prefetchPost(queryClient: QueryClient, postId: string) {
  await Promise.all([
    // Prefetch post data
    queryClient.prefetchQuery({
      queryKey: ['post', postId],
      queryFn: async () => {
        const response = await fetch(`/api/posts/${postId}`)
        if (!response.ok) throw new Error('Failed to fetch post')
        return response.json()
      },
      staleTime: 5 * 60 * 1000,
    }),
    // Prefetch comments
    queryClient.prefetchQuery({
      queryKey: ['post', postId, 'comments'],
      queryFn: async () => {
        const response = await fetch(`/api/posts/${postId}/comments`)
        if (!response.ok) throw new Error('Failed to fetch comments')
        return response.json()
      },
      staleTime: 1 * 60 * 1000,
    }),
  ])
}

/**
 * Prefetch community data
 */
export async function prefetchCommunity(queryClient: QueryClient, communityId: string) {
  await Promise.all([
    // Prefetch community info
    queryClient.prefetchQuery({
      queryKey: ['community', communityId],
      queryFn: async () => {
        const response = await fetch(`/api/communities/${communityId}`)
        if (!response.ok) throw new Error('Failed to fetch community')
        return response.json()
      },
      staleTime: 10 * 60 * 1000,
    }),
    // Prefetch community posts
    queryClient.prefetchQuery({
      queryKey: ['community', communityId, 'posts'],
      queryFn: async () => {
        const response = await fetch(`/api/communities/${communityId}/posts?limit=10`)
        if (!response.ok) throw new Error('Failed to fetch posts')
        return response.json()
      },
      staleTime: 2 * 60 * 1000,
    }),
  ])
}

/**
 * Prefetch event details
 */
export async function prefetchEvent(queryClient: QueryClient, eventId: string) {
  await queryClient.prefetchQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}`)
      if (!response.ok) throw new Error('Failed to fetch event')
      return response.json()
    },
    staleTime: 10 * 60 * 1000,
  })
}

/**
 * Prefetch artist profile
 */
export async function prefetchArtist(queryClient: QueryClient, artistId: string) {
  await Promise.all([
    // Prefetch artist info
    queryClient.prefetchQuery({
      queryKey: ['artist', artistId],
      queryFn: async () => {
        const response = await fetch(`/api/artists/${artistId}`)
        if (!response.ok) throw new Error('Failed to fetch artist')
        return response.json()
      },
      staleTime: 10 * 60 * 1000,
    }),
    // Prefetch artist events
    queryClient.prefetchQuery({
      queryKey: ['artist', artistId, 'events'],
      queryFn: async () => {
        const response = await fetch(`/api/artists/${artistId}/events?limit=5`)
        if (!response.ok) throw new Error('Failed to fetch events')
        return response.json()
      },
      staleTime: 5 * 60 * 1000,
    }),
  ])
}

/**
 * Prefetch next page of paginated data
 */
export async function prefetchNextPage(
  queryClient: QueryClient,
  queryKey: string[],
  currentPage: number,
  fetchFn: (page: number) => Promise<unknown>
) {
  const nextPage = currentPage + 1

  await queryClient.prefetchQuery({
    queryKey: [...queryKey, { page: nextPage }],
    queryFn: () => fetchFn(nextPage),
    staleTime: 1 * 60 * 1000,
  })
}

/**
 * Prefetch feed data (posts from followed users/communities)
 */
export async function prefetchFeed(queryClient: QueryClient, page = 1, limit = 20) {
  await queryClient.prefetchQuery({
    queryKey: ['feed', { page, limit }],
    queryFn: async () => {
      const response = await fetch(`/api/feed?page=${page}&limit=${limit}`)
      if (!response.ok) throw new Error('Failed to fetch feed')
      return response.json()
    },
    staleTime: 1 * 60 * 1000,
  })
}

/**
 * Prefetch search results
 */
export async function prefetchSearchResults(
  queryClient: QueryClient,
  query: string,
  filters?: Record<string, unknown>
) {
  if (!query || query.length < 2) return

  const searchParams = new URLSearchParams({
    q: query,
    ...filters,
  })

  await queryClient.prefetchQuery({
    queryKey: ['search', query, filters],
    queryFn: async () => {
      const response = await fetch(`/api/search?${searchParams}`)
      if (!response.ok) throw new Error('Failed to search')
      return response.json()
    },
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Prefetch notifications
 */
export async function prefetchNotifications(queryClient: QueryClient) {
  await queryClient.prefetchQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await fetch('/api/notifications')
      if (!response.ok) throw new Error('Failed to fetch notifications')
      return response.json()
    },
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Prefetch messages/conversations
 */
export async function prefetchConversations(queryClient: QueryClient) {
  await queryClient.prefetchQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const response = await fetch('/api/messages/conversations')
      if (!response.ok) throw new Error('Failed to fetch conversations')
      return response.json()
    },
    staleTime: 1 * 60 * 1000,
  })
}

/**
 * Smart prefetching based on user behavior
 * Prefetch data that's likely to be needed next
 */
export async function smartPrefetch(
  queryClient: QueryClient,
  context: {
    currentRoute: string
    userAction?: string
    relevantIds?: string[]
  }
) {
  const { currentRoute, userAction, relevantIds } = context

  // Prefetch based on current route
  if (currentRoute === '/feed') {
    // Prefetch next page of feed
    await prefetchFeed(queryClient, 2)
    // Prefetch notifications
    await prefetchNotifications(queryClient)
  } else if (currentRoute.startsWith('/post/')) {
    // Prefetch author profile if hovering/viewing post
    if (relevantIds?.[0]) {
      await prefetchUserProfile(queryClient, relevantIds[0])
    }
  } else if (currentRoute.startsWith('/community/')) {
    // Prefetch related communities or members
    if (relevantIds?.[0]) {
      await prefetchCommunity(queryClient, relevantIds[0])
    }
  }

  // Prefetch based on user action
  if (userAction === 'hover_profile') {
    if (relevantIds?.[0]) {
      await prefetchUserProfile(queryClient, relevantIds[0])
    }
  } else if (userAction === 'scroll_near_bottom') {
    // Prefetch next page when user scrolls near bottom
    // This is handled by the component that detects scroll position
  }
}
