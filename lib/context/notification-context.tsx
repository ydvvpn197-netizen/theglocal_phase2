'use client'

import { logger } from '@/lib/utils/logger'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import {
  InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { RealtimeChannel } from '@supabase/supabase-js'
import { Notification, NotificationWithActor } from '@/lib/types/notifications'
import {
  notificationKeys,
  NotificationListResponse,
  NotificationPageInfo,
} from '@/lib/queries/notifications'
import {
  deleteNotificationById,
  fetchNotificationSummary,
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  mergeNotificationPages,
} from '@/lib/services/notifications'
import { useAuth } from './auth-context'
import { createClient } from '@/lib/supabase/client'
import {
  generateSubscriptionKey,
  realtimeConnectionManager,
  retryWithBackoff,
} from '@/lib/utils/realtime-connection-manager'
import { createDuplicatePrevention } from '@/lib/utils/duplicate-prevention'
import { isOnline } from '@/lib/utils/error-handler'
import { notificationLogger } from '@/lib/utils/notification-logger'

interface NotificationContextType {
  notifications: NotificationWithActor[]
  unreadCount: number
  isLoading: boolean
  isReady: boolean
  error: string | null
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (notificationId: string) => Promise<void>
  refreshNotifications: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

type NotificationListCache = InfiniteData<NotificationListResponse> | undefined

interface NotificationSummaryState {
  unreadCount?: number
  _frozen?: boolean
  [key: string]: unknown
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const isAuthenticated = Boolean(user)
  const supabase = useMemo(() => createClient(), [])

  // Essential refs
  const channelRef = useRef<RealtimeChannel | null>(null)
  const subscriptionKeyRef = useRef<string | null>(null)
  const duplicatePreventionRef = useRef(createDuplicatePrevention(5 * 60 * 1000, 1000))

  // Version tracking to prevent stale updates
  const versionRef = useRef(0)

  // Mutation queue to serialize operations
  const mutationQueueRef = useRef<Promise<void>>(Promise.resolve())

  // Track processed realtime events to prevent duplicates
  const processedEventsRef = useRef(new Set<string>())

  // Cleanup old processed events periodically
  useEffect(() => {
    const cleanup = setInterval(
      () => {
        if (processedEventsRef.current.size > 1000) {
          processedEventsRef.current.clear()
          notificationLogger.cache('Cleared processed events cache', {
            reason: 'size_limit_reached',
          })
        }
      },
      5 * 60 * 1000
    ) // Every 5 minutes

    return () => clearInterval(cleanup)
  }, [])

  const notificationsQuery = useInfiniteQuery({
    queryKey: notificationKeys.list('all'),
    queryFn: ({ pageParam, signal }) =>
      fetchNotifications({
        filter: 'all',
        cursor: pageParam ?? undefined,
        limit: 20,
        signal,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.pageInfo.hasMore ? (lastPage.pageInfo.nextCursor ?? undefined) : undefined,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    enabled: isAuthenticated,
  })

  const summaryQuery = useQuery({
    queryKey: notificationKeys.summary(),
    queryFn: ({ signal }) => fetchNotificationSummary(signal),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    enabled: isAuthenticated,
  })

  const notifications = useMemo(
    () => (isAuthenticated ? mergeNotificationPages(notificationsQuery.data?.pages) : []),
    [isAuthenticated, notificationsQuery.data]
  )

  const unreadCount = isAuthenticated ? (summaryQuery.data?.unreadCount ?? 0) : 0

  const error =
    (notificationsQuery.error instanceof Error && notificationsQuery.error.message) ||
    (summaryQuery.error instanceof Error && summaryQuery.error.message) ||
    null

  const markAsReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onMutate: async (notificationId: string) => {
      // Increment version to track this mutation
      versionRef.current++
      const mutationVersion = versionRef.current

      notificationLogger.mutation('mark_as_read_start', {
        id: notificationId,
        version: mutationVersion,
      })

      await queryClient.cancelQueries({ queryKey: notificationKeys.all })

      const previousList = queryClient.getQueryData<NotificationListCache>(
        notificationKeys.list('all')
      )
      const previousSummary = queryClient.getQueryData(notificationKeys.summary())

      const wasUnread = previousList?.pages.some((page) =>
        page.notifications.some((notif) => notif.id === notificationId && !notif.is_read)
      )

      if (!wasUnread) {
        notificationLogger.duplicate(notificationId, 'mutation')
      }

      const now = new Date().toISOString()

      // Optimistically update all filter queries
      queryClient.setQueryData<NotificationListCache>(notificationKeys.list('all'), (current) => {
        if (!current) return current
        return {
          ...current,
          pages: current.pages.map((page) => ({
            ...page,
            notifications: page.notifications.map((notif) =>
              notif.id === notificationId
                ? { ...notif, is_read: true, read_at: notif.read_at ?? now }
                : notif
            ),
          })),
        }
      })

      queryClient.setQueryData<NotificationListCache>(
        notificationKeys.list('unread'),
        (current) => {
          if (!current) return current
          return {
            ...current,
            pages: current.pages.map((page) => ({
              ...page,
              notifications: page.notifications.filter((notif) => notif.id !== notificationId),
            })),
          }
        }
      )

      if (wasUnread) {
        queryClient.setQueryData<{ unreadCount: number }>(notificationKeys.summary(), (current) => {
          if (!current) return current
          const newCount = Math.max((current.unreadCount ?? 0) - 1, 0)
          notificationLogger.count('optimistic_decrement', newCount, -1)
          return {
            ...current,
            unreadCount: newCount,
          }
        })
      }

      return { mutationVersion, previousList, previousSummary, wasUnread }
    },
    onError: (_error, notificationId, context) => {
      notificationLogger.race('mark_as_read_error', {
        id: notificationId,
        version: context?.mutationVersion,
      })

      if (context?.previousList) {
        queryClient.setQueryData(notificationKeys.list('all'), context.previousList)
      }
      if (context?.previousSummary) {
        queryClient.setQueryData(notificationKeys.summary(), context.previousSummary)
      }
    },
    onSuccess: (_data, notificationId, context) => {
      notificationLogger.mutation('mark_as_read_success', {
        id: notificationId,
        version: context?.mutationVersion ?? 0,
      })

      // Only invalidate if data might have changed
      if (context?.wasUnread) {
        queryClient.invalidateQueries({
          queryKey: notificationKeys.summary(),
          refetchType: 'none', // Don't refetch, just mark as stale
        })
      }
    },
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onMutate: async () => {
      // Increment version for batch operation
      versionRef.current++
      const mutationVersion = versionRef.current

      notificationLogger.mutation('mark_all_as_read_start', {
        id: 'batch',
        version: mutationVersion,
      })

      await queryClient.cancelQueries({ queryKey: notificationKeys.all })

      const previousList = queryClient.getQueryData<NotificationListCache>(
        notificationKeys.list('all')
      )
      const previousSummary = queryClient.getQueryData<NotificationSummaryState>(
        notificationKeys.summary()
      )
      const previousCount = previousSummary?.unreadCount ?? 0
      const now = new Date().toISOString()

      const filters: Array<'all' | 'unread' | 'read'> = ['all', 'unread', 'read']
      filters.forEach((filter) => {
        queryClient.setQueryData<NotificationListCache>(
          notificationKeys.list(filter),
          (current) => {
            if (!current) return current
            return {
              ...current,
              pages: current.pages.map((page) => ({
                ...page,
                notifications: page.notifications.map((notif) => ({
                  ...notif,
                  is_read: true,
                  read_at: notif.read_at ?? now,
                })),
              })),
            }
          }
        )
      })

      queryClient.setQueryData(notificationKeys.summary(), (current: unknown) => {
        if (!current || typeof current !== 'object') return current
        const currentData = current as { unreadCount?: number; [key: string]: unknown }
        notificationLogger.count('optimistic_zero', 0, -previousCount)
        return {
          ...currentData,
          unreadCount: 0,
        }
      })

      return { mutationVersion, previousList, previousSummary, previousCount }
    },
    onError: (_error, _variables, context) => {
      notificationLogger.race('mark_all_as_read_error', {
        version: context?.mutationVersion,
      })

      if (context?.previousList) {
        queryClient.setQueryData(notificationKeys.list('all'), context.previousList)
      }
      if (context?.previousSummary) {
        queryClient.setQueryData(notificationKeys.summary(), context.previousSummary)
      }
    },
    onSuccess: (_data, _variables, context) => {
      notificationLogger.mutation('mark_all_as_read_success', {
        id: 'batch',
        version: context?.mutationVersion ?? 0,
      })

      // Don't invalidate - rely on optimistic update
      // Invalidation would cause count flicker
    },
  })

  const deleteNotificationMutation = useMutation({
    mutationFn: deleteNotificationById,
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all })

      const previousList = queryClient.getQueryData<NotificationListCache>(
        notificationKeys.list('all')
      )
      const previousSummary = queryClient.getQueryData(notificationKeys.summary())

      const wasUnread = previousList?.pages.some((page) =>
        page.notifications.some((notif) => notif.id === notificationId && !notif.is_read)
      )

      const filters: Array<'all' | 'unread' | 'read'> = ['all', 'unread', 'read']
      filters.forEach((filter) => {
        queryClient.setQueryData<NotificationListCache>(
          notificationKeys.list(filter),
          (current) => {
            if (!current) return current
            return {
              ...current,
              pages: current.pages.map((page) => ({
                ...page,
                notifications: page.notifications.filter((notif) => notif.id !== notificationId),
              })),
            }
          }
        )
      })

      if (wasUnread) {
        queryClient.setQueryData(notificationKeys.summary(), (current: unknown) => {
          if (!current || typeof current !== 'object') return current
          const currentData = current as NotificationSummaryState
          return {
            ...currentData,
            unreadCount: Math.max((currentData.unreadCount ?? 0) - 1, 0),
          }
        })
      }

      return { previousList, previousSummary }
    },
    onError: (_error, _notificationId, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(notificationKeys.list('all'), context.previousList)
      }
      if (context?.previousSummary) {
        queryClient.setQueryData(notificationKeys.summary(), context.previousSummary)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.summary() })
    },
  })

  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) return

    // Check network status before refreshing
    if (!isOnline()) {
      notificationLogger.cache('refresh_skipped_offline', { reason: 'offline' })
      return
    }

    const startTime = Date.now()

    try {
      // Freeze current count to prevent flicker during refetch
      const currentSummary = queryClient.getQueryData<NotificationSummaryState>(
        notificationKeys.summary()
      )
      const frozenCount = currentSummary?.unreadCount ?? 0

      notificationLogger.cache('refresh_start', { frozenCount })

      // Mark as frozen during refresh
      queryClient.setQueryData(notificationKeys.summary(), (current: unknown) => {
        if (!current || typeof current !== 'object') return current
        const currentData = current as NotificationSummaryState
        return {
          ...currentData,
          _frozen: true,
          unreadCount: frozenCount, // Preserve count
        }
      })

      // Invalidate to trigger refetch
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.summary(),
        refetchType: 'active', // Only refetch if there are active observers
      })

      // Unfreeze after refetch completes
      setTimeout(() => {
        queryClient.setQueryData(notificationKeys.summary(), (current: unknown) => {
          if (!current || typeof current !== 'object') return current
          const currentData = current as NotificationSummaryState
          const { _frozen, ...rest } = currentData
          return rest
        })

        const duration = Date.now() - startTime
        notificationLogger.performance('refresh_complete', duration)
      }, 100)
    } catch (error) {
      logger.error('Error refreshing notifications:', error)
      notificationLogger.race('refresh_error', { error })

      // Unfreeze on error
      queryClient.setQueryData(notificationKeys.summary(), (current: unknown) => {
        if (!current || typeof current !== 'object') return current
        const currentData = current as NotificationSummaryState
        const { _frozen, ...rest } = currentData
        return rest
      })
    }
  }, [isAuthenticated, queryClient])

  // Set up realtime subscription
  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (channelRef.current && subscriptionKeyRef.current) {
        realtimeConnectionManager.releaseChannel(subscriptionKeyRef.current, channelRef.current)
        channelRef.current = null
        subscriptionKeyRef.current = null
      }
      return
    }

    const subscriptionKey = generateSubscriptionKey('notifications', user.id)
    subscriptionKeyRef.current = subscriptionKey

    const channel = realtimeConnectionManager.getChannel(subscriptionKey, () =>
      supabase.channel(subscriptionKey)
    )
    channelRef.current = channel

    const filter = `user_id=eq.${user.id}`

    // Handle INSERT events
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter },
      (payload) => {
        const notification = payload.new as Notification
        if (!notification?.id) return

        // Create unique event ID for duplicate detection
        const eventId = `INSERT:${notification.id}:${payload.commit_timestamp || Date.now()}`

        // Check if we've already processed this event
        if (processedEventsRef.current.has(eventId)) {
          notificationLogger.duplicate(notification.id, 'realtime')
          return
        }

        // Also check legacy duplicate prevention
        if (duplicatePreventionRef.current.checkAndMark(notification.id)) {
          notificationLogger.duplicate(notification.id, 'realtime')
          return
        }

        // Mark event as processed
        processedEventsRef.current.add(eventId)

        // Validate notification data
        if (!notification.id || !notification.user_id || !notification.type) {
          logger.warn('Invalid notification data received:', notification)
          duplicatePreventionRef.current.remove(notification.id)
          processedEventsRef.current.delete(eventId)
          return
        }

        notificationLogger.realtime({
          event: 'INSERT',
          id: notification.id,
          timestamp: notification.created_at,
          commit_timestamp: payload.commit_timestamp,
        })

        // Optimistically update if unread
        if (!notification.is_read) {
          // Increment unread count (only if not frozen)
          queryClient.setQueryData(notificationKeys.summary(), (current: unknown) => {
            if (!current || typeof current !== 'object') return current
            const currentData = current as NotificationSummaryState

            // Don't update if frozen during refresh
            if (currentData._frozen) {
              notificationLogger.cache('increment_skipped_frozen', { id: notification.id })
              return currentData
            }

            const newCount = (currentData.unreadCount ?? 0) + 1
            notificationLogger.count('realtime_increment', newCount, 1)

            return {
              ...currentData,
              unreadCount: newCount,
            }
          })

          // Add to list cache if it exists
          queryClient.setQueryData<NotificationListCache>(
            notificationKeys.list('all'),
            (current) => {
              if (!current || !current.pages || current.pages.length === 0) {
                return current
              }

              const firstPage = current.pages[0]
              if (!firstPage) {
                return current
              }

              const notificationWithActor: NotificationWithActor = {
                ...notification,
                actor: notification.actor_id
                  ? { anonymous_handle: '', avatar_seed: '' }
                  : undefined,
              }

              // Check if already exists
              if (firstPage.notifications.some((n) => n.id === notification.id)) {
                notificationLogger.duplicate(notification.id, 'realtime')
                return current
              }

              const pageInfo: NotificationPageInfo = firstPage.pageInfo || {
                hasMore: false,
                nextCursor: null,
                limit: 20,
                filter: 'all',
              }

              notificationLogger.cache('notification_added_to_list', {
                id: notification.id,
                type: notification.type,
              })

              return {
                ...current,
                pages: [
                  {
                    ...firstPage,
                    pageInfo,
                    notifications: [notificationWithActor, ...firstPage.notifications],
                  },
                  ...current.pages.slice(1),
                ],
              }
            }
          )
        }

        // Don't invalidate - rely on optimistic updates to prevent flicker
      }
    )

    // Handle UPDATE events
    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'notifications', filter },
      (payload) => {
        const notification = payload.new as Notification
        if (!notification?.id) return

        // Create unique event ID
        const eventId = `UPDATE:${notification.id}:${payload.commit_timestamp || Date.now()}`

        // Check if already processed
        if (processedEventsRef.current.has(eventId)) {
          notificationLogger.duplicate(notification.id, 'realtime')
          return
        }

        processedEventsRef.current.add(eventId)

        notificationLogger.realtime({
          event: 'UPDATE',
          id: notification.id,
          timestamp: notification.created_at,
          commit_timestamp: payload.commit_timestamp,
        })

        // Update in cache
        queryClient.setQueryData<NotificationListCache>(notificationKeys.list('all'), (current) => {
          if (!current) return current
          return {
            ...current,
            pages: current.pages.map((page) => ({
              ...page,
              notifications: page.notifications.map((notif) =>
                notif.id === notification.id ? { ...notif, ...notification } : notif
              ),
            })),
          }
        })

        // Update unread count if read status changed
        if (notification.is_read !== undefined) {
          const wasUnread = !payload.old?.is_read
          const isNowRead = notification.is_read

          queryClient.setQueryData(notificationKeys.summary(), (current: unknown) => {
            if (!current || typeof current !== 'object') return current
            const currentData = current as NotificationSummaryState

            // Don't update if frozen
            if (currentData._frozen) {
              notificationLogger.cache('update_skipped_frozen', { id: notification.id })
              return currentData
            }

            if (wasUnread && isNowRead) {
              const newCount = Math.max((currentData.unreadCount ?? 0) - 1, 0)
              notificationLogger.count('realtime_decrement', newCount, -1)
              return {
                ...currentData,
                unreadCount: newCount,
              }
            } else if (!wasUnread && !isNowRead) {
              const newCount = (currentData.unreadCount ?? 0) + 1
              notificationLogger.count('realtime_increment', newCount, 1)
              return {
                ...currentData,
                unreadCount: newCount,
              }
            }
            return currentData
          })
        }

        // Don't invalidate - rely on optimistic updates
      }
    )

    // Handle DELETE events
    channel.on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'notifications', filter },
      (payload) => {
        const notification = payload.old as Notification
        if (!notification?.id) return

        // Create unique event ID
        const eventId = `DELETE:${notification.id}:${payload.commit_timestamp || Date.now()}`

        // Check if already processed
        if (processedEventsRef.current.has(eventId)) {
          notificationLogger.duplicate(notification.id, 'realtime')
          return
        }

        processedEventsRef.current.add(eventId)

        notificationLogger.realtime({
          event: 'DELETE',
          id: notification.id,
          timestamp: notification.created_at,
          commit_timestamp: payload.commit_timestamp,
        })

        duplicatePreventionRef.current.remove(notification.id)

        const wasUnread = !notification.is_read || !notification.read_at

        // Remove from cache
        queryClient.setQueryData<NotificationListCache>(notificationKeys.list('all'), (current) => {
          if (!current) return current
          return {
            ...current,
            pages: current.pages.map((page) => ({
              ...page,
              notifications: page.notifications.filter((notif) => notif.id !== notification.id),
            })),
          }
        })

        // Decrement count if was unread
        if (wasUnread) {
          queryClient.setQueryData(notificationKeys.summary(), (current: unknown) => {
            if (!current || typeof current !== 'object') return current
            const currentData = current as NotificationSummaryState

            // Don't update if frozen
            if (currentData._frozen) {
              notificationLogger.cache('delete_skipped_frozen', { id: notification.id })
              return currentData
            }

            const newCount = Math.max((currentData.unreadCount ?? 0) - 1, 0)
            notificationLogger.count('realtime_decrement', newCount, -1)

            return {
              ...currentData,
              unreadCount: newCount,
            }
          })
        }

        // Don't invalidate - rely on optimistic updates
      }
    )

    const attemptSubscribe = () =>
      new Promise<void>((resolve, reject) => {
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            resolve()
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            reject(new Error(`Realtime channel ${status}`))
          }
        })
      })

    retryWithBackoff(attemptSubscribe, undefined, (attempt, error) => {
      logger.warn(`[Notifications] realtime subscribe retry ${attempt}`, error)
    }).catch((error) => {
      logger.error('Failed to subscribe to notifications realtime channel:', error)
    })

    // Capture ref values for cleanup
    const duplicatePrevention = duplicatePreventionRef.current
    const cleanupChannel = channelRef.current
    const cleanupSubscriptionKey = subscriptionKeyRef.current

    return () => {
      duplicatePrevention.clear()
      if (cleanupChannel && cleanupSubscriptionKey) {
        realtimeConnectionManager.releaseChannel(cleanupSubscriptionKey, cleanupChannel)
        channelRef.current = null
        subscriptionKeyRef.current = null
      }
    }
  }, [isAuthenticated, queryClient, supabase, user])

  // Serialized mutation handlers to prevent race conditions
  const handleMarkAsRead = useCallback(
    (notificationId: string) => {
      if (!isAuthenticated) return Promise.resolve()

      // Chain mutations to prevent concurrent updates
      mutationQueueRef.current = mutationQueueRef.current
        .then(() => markAsReadMutation.mutateAsync(notificationId))
        .catch((err) => {
          logger.error('Mark as read mutation failed:', err)
          throw err
        })

      return mutationQueueRef.current
    },
    [isAuthenticated, markAsReadMutation]
  )

  const handleMarkAllAsRead = useCallback(() => {
    if (!isAuthenticated) return Promise.resolve()

    // Chain mutations to prevent concurrent updates
    mutationQueueRef.current = mutationQueueRef.current
      .then(() => markAllAsReadMutation.mutateAsync())
      .catch((err) => {
        logger.error('Mark all as read mutation failed:', err)
        throw err
      })

    return mutationQueueRef.current
  }, [isAuthenticated, markAllAsReadMutation])

  const handleDeleteNotification = useCallback(
    (notificationId: string) => {
      if (!isAuthenticated) return Promise.resolve()

      // Chain mutations to prevent concurrent updates
      mutationQueueRef.current = mutationQueueRef.current
        .then(() => deleteNotificationMutation.mutateAsync(notificationId))
        .catch((err) => {
          logger.error('Delete notification mutation failed:', err)
          throw err
        })

      return mutationQueueRef.current
    },
    [isAuthenticated, deleteNotificationMutation]
  )

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isLoading: isAuthenticated && (notificationsQuery.isLoading || summaryQuery.isLoading),
    isReady: !isAuthenticated || (notificationsQuery.isSuccess && summaryQuery.isSuccess),
    error: isAuthenticated ? error : null,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    deleteNotification: handleDeleteNotification,
    refreshNotifications,
  }

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    logger.warn('useNotifications called outside NotificationProvider')
    return {
      notifications: [],
      unreadCount: 0,
      isLoading: true,
      isReady: false,
      error: null,
      markAsRead: async () => {},
      markAllAsRead: async () => {},
      deleteNotification: async () => {},
      refreshNotifications: async () => {},
    }
  }
  return context
}
