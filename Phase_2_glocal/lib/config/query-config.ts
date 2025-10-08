/**
 * React Query Configuration
 * Centralized caching strategies for optimal performance
 */

import { QueryClient } from '@tanstack/react-query'

// Default cache times (in milliseconds)
export const CACHE_TIMES = {
  // Frequently changing data - short cache
  FEED: 30 * 1000, // 30 seconds
  POSTS: 60 * 1000, // 1 minute
  COMMENTS: 30 * 1000, // 30 seconds

  // Moderately changing data - medium cache
  COMMUNITIES: 5 * 60 * 1000, // 5 minutes
  ARTISTS: 5 * 60 * 1000, // 5 minutes
  EVENTS: 5 * 60 * 1000, // 5 minutes
  BOOKINGS: 2 * 60 * 1000, // 2 minutes

  // Rarely changing data - long cache
  USER_PROFILE: 10 * 60 * 1000, // 10 minutes
  COMMUNITY_DETAILS: 10 * 60 * 1000, // 10 minutes
  ARTIST_PROFILE: 10 * 60 * 1000, // 10 minutes

  // Static or semi-static data - very long cache
  DISCOVERY_NEWS: 15 * 60 * 1000, // 15 minutes
  DISCOVERY_REDDIT: 15 * 60 * 1000, // 15 minutes
  TRANSPARENCY_STATS: 30 * 60 * 1000, // 30 minutes
}

// Stale times - when to consider data stale and refetch in background
export const STALE_TIMES = {
  FEED: 15 * 1000, // 15 seconds
  POSTS: 30 * 1000, // 30 seconds
  COMMUNITIES: 3 * 60 * 1000, // 3 minutes
  ARTISTS: 3 * 60 * 1000, // 3 minutes
  USER_PROFILE: 5 * 60 * 1000, // 5 minutes
  DISCOVERY: 10 * 60 * 1000, // 10 minutes
}

// Query keys for consistent cache management
export const QUERY_KEYS = {
  // User
  AUTH: ['auth'],
  USER_PROFILE: (userId: string) => ['user', userId],

  // Feed
  FEED: (params?: object) => ['feed', params],
  DISCOVERY: (params?: object) => ['discovery', params],

  // Communities
  COMMUNITIES: (params?: object) => ['communities', params],
  COMMUNITY: (slug: string) => ['community', slug],
  COMMUNITY_POSTS: (communityId: string, params?: object) => [
    'community',
    communityId,
    'posts',
    params,
  ],
  COMMUNITY_MEMBERS: (communityId: string) => ['community', communityId, 'members'],

  // Posts
  POSTS: (params?: object) => ['posts', params],
  POST: (postId: string) => ['post', postId],
  POST_COMMENTS: (postId: string) => ['post', postId, 'comments'],

  // Comments
  COMMENT: (commentId: string) => ['comment', commentId],

  // Polls
  POLLS: (params?: object) => ['polls', params],
  POLL: (pollId: string) => ['poll', pollId],
  POLL_RESULTS: (pollId: string) => ['poll', pollId, 'results'],

  // Artists
  ARTISTS: (params?: object) => ['artists', params],
  ARTIST: (artistId: string) => ['artist', artistId],
  ARTIST_EVENTS: (artistId: string) => ['artist', artistId, 'events'],

  // Events
  EVENTS: (params?: object) => ['events', params],
  EVENT: (eventId: string) => ['event', eventId],

  // Bookings
  BOOKINGS: (params?: object) => ['bookings', params],
  BOOKING: (bookingId: string) => ['booking', bookingId],
  BOOKING_MESSAGES: (bookingId: string) => ['booking', bookingId, 'messages'],

  // Reports
  REPORTS: (params?: object) => ['reports', params],
  REPORT: (reportId: string) => ['report', reportId],

  // Moderation
  MODERATION_LOG: (params?: object) => ['moderation-log', params],

  // Transparency
  TRANSPARENCY_STATS: ['transparency', 'stats'],
}

// Create Query Client with optimized defaults
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Stale-while-revalidate strategy
        staleTime: STALE_TIMES.POSTS,
        gcTime: CACHE_TIMES.POSTS,

        // Retry configuration
        retry: 1,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

        // Refetch configuration
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        refetchOnMount: false,

        // Error handling
        throwOnError: false,
      },
      mutations: {
        retry: 0,
        throwOnError: false,
      },
    },
  })
}

// Prefetch helpers
export const prefetchStrategies = {
  // Prefetch next page for infinite scroll
  prefetchNextPage: (queryClient: QueryClient, queryKey: any[], nextOffset: number) => {
    queryClient.prefetchQuery({
      queryKey: [...queryKey, { offset: nextOffset }],
      staleTime: STALE_TIMES.FEED,
    })
  },

  // Prefetch related data
  prefetchRelated: (queryClient: QueryClient, queries: Array<{ queryKey: any[]; queryFn: () => Promise<any> }>) => {
    queries.forEach(({ queryKey, queryFn }) => {
      queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime: STALE_TIMES.POSTS,
      })
    })
  },
}

// Cache invalidation helpers
export const invalidateCache = {
  // Invalidate all posts queries after creating/updating/deleting
  posts: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: ['posts'] })
    queryClient.invalidateQueries({ queryKey: ['feed'] })
  },

  // Invalidate specific community data
  community: (queryClient: QueryClient, communityId: string) => {
    queryClient.invalidateQueries({ queryKey: ['community', communityId] })
    queryClient.invalidateQueries({ queryKey: ['communities'] })
  },

  // Invalidate user bookings
  bookings: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: ['bookings'] })
  },

  // Invalidate artist data
  artist: (queryClient: QueryClient, artistId: string) => {
    queryClient.invalidateQueries({ queryKey: ['artist', artistId] })
    queryClient.invalidateQueries({ queryKey: ['artists'] })
  },
}

