'use client'

import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { NotificationFilter, notificationKeys } from '@/lib/queries/notifications'
import { fetchNotifications, mergeNotificationPages } from '@/lib/services/notifications'

interface UseNotificationFeedOptions {
  filter?: NotificationFilter
  limit?: number
}

export function useNotificationFeed({
  filter = 'all',
  limit = 20,
}: UseNotificationFeedOptions = {}) {
  const query = useInfiniteQuery({
    queryKey: notificationKeys.list(filter),
    queryFn: ({ pageParam, signal }) =>
      fetchNotifications({
        filter,
        cursor: pageParam ?? undefined,
        limit,
        signal,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.pageInfo.hasMore ? (lastPage.pageInfo.nextCursor ?? undefined) : undefined,
    refetchOnWindowFocus: filter === 'all',
    staleTime: filter === 'all' ? 30_000 : 5_000,
  })

  const notifications = useMemo(
    () => mergeNotificationPages(query.data?.pages),
    [query.data?.pages]
  )

  return {
    notifications,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
