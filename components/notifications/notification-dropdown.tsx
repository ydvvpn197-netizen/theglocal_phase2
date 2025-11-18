'use client'

import { logger } from '@/lib/utils/logger'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useNotifications } from '@/lib/context/notification-context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import {
  MessageSquare,
  ThumbsUp,
  Calendar,
  Users,
  Music,
  CheckCheck,
  Settings,
  Bell,
  Shield,
  MessageCircle,
  RefreshCw,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { NotificationType } from '@/lib/types/notifications'
import { isValidNotificationLink, normalizeNotificationLink } from '@/lib/utils/notifications'
import { useToast } from '@/lib/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'
import { notificationKeys } from '@/lib/queries/notifications'

interface NotificationDropdownProps {
  onClose: () => void
}

import type { LucideIcon } from 'lucide-react'
const notificationIcons: Record<NotificationType, LucideIcon> = {
  comment_on_post: MessageSquare,
  comment_reply: MessageSquare,
  post_upvote: ThumbsUp,
  poll_upvote: ThumbsUp,
  comment_upvote: ThumbsUp,
  booking_update: Calendar,
  booking_request: Calendar,
  community_invite: Users,
  artist_response: Music,
  event_reminder: Calendar,
  community_role_change: Shield,
  direct_message: MessageCircle,
  booking_message: MessageCircle,
  subscription_reminder: AlertCircle,
  subscription_update: Shield,
  subscription_expired: AlertCircle,
  content_reported: AlertCircle,
  mention: MessageSquare,
  moderation_action: Shield,
}

// Safe date formatting helper
const formatNotificationDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Recently'
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Recently'
    return formatDistanceToNow(date, { addSuffix: true })
  } catch {
    return 'Recently'
  }
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    isLoading,
    error,
    refreshNotifications,
  } = useNotifications()
  const [navigatingId, setNavigatingId] = useState<string | null>(null)
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const hasRefreshedRef = useRef(false)

  // Only refresh if data is stale (>1 minute old)
  // Don't refresh on every open to prevent count flicker
  useEffect(() => {
    if (!hasRefreshedRef.current && !isRefreshing) {
      const lastFetch = queryClient.getQueryState(notificationKeys.summary())?.dataUpdatedAt

      const isStale = !lastFetch || Date.now() - lastFetch > 60_000

      if (isStale) {
        hasRefreshedRef.current = true
        setIsRefreshing(true)
        refreshNotifications().finally(() => {
          setIsRefreshing(false)
        })
      }
    }
  }, [queryClient, refreshNotifications, isRefreshing])

  const handleNotificationClick = async (notificationId: string, link: string | null) => {
    if (navigatingId === notificationId) {
      return // Already navigating
    }

    try {
      setNavigatingId(notificationId)

      // Mark as read first
      try {
        await markAsRead(notificationId)
      } catch (markError) {
        logger.error('Error marking notification as read:', markError)
        // Continue with navigation even if mark fails
      }

      // Validate and normalize the link
      const normalizedLink = normalizeNotificationLink(link)

      if (normalizedLink && isValidNotificationLink(normalizedLink)) {
        // Close dropdown first
        onClose()

        // Small delay to ensure dropdown closes smoothly
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Navigate to the link
        try {
          router.push(normalizedLink)
        } catch (navError) {
          logger.error('Navigation error:', navError)
          toast({
            title: 'Navigation failed',
            description: 'Could not navigate to the notification link. Please try again.',
            variant: 'destructive',
          })
        }
      } else if (link) {
        // Invalid link, show error but still close dropdown
        onClose()
        toast({
          title: 'Invalid link',
          description: 'The notification link is invalid or unsafe.',
          variant: 'destructive',
        })
      } else {
        // No link, just close dropdown
        onClose()
      }
    } catch (error) {
      logger.error('Error handling notification click:', error)
      setNavigatingId(null)
      toast({
        title: 'Error',
        description: 'An error occurred while processing the notification.',
        variant: 'destructive',
      })
      // Still close the dropdown even if there's an error
      onClose()
    } finally {
      setNavigatingId(null)
    }
  }

  const handleMarkAllAsRead = async () => {
    if (markingAllAsRead) {
      return // Already marking
    }

    // Prevent concurrent operations
    if (navigatingId !== null) {
      toast({
        title: 'Please wait',
        description: 'Another operation is in progress.',
        variant: 'default',
      })
      return
    }

    try {
      setMarkingAllAsRead(true)
      logger.info('[NotificationDropdown] Marking all notifications as read...')
      await markAllAsRead()
      logger.info('[NotificationDropdown] Successfully marked all notifications as read')
      toast({
        title: 'All notifications marked as read',
        description: 'All notifications have been marked as read.',
      })
    } catch (error) {
      logger.error('[NotificationDropdown] Error marking all as read:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      toast({
        title: 'Error',
        description: `Failed to mark all notifications as read: ${errorMessage}`,
        variant: 'destructive',
      })
    } finally {
      setMarkingAllAsRead(false)
    }
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Notifications</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={markingAllAsRead}
                className="text-xs"
              >
                {markingAllAsRead ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <CheckCheck className="h-4 w-4 mr-1" />
                )}
                Mark all read
              </Button>
            )}
            <Link href="/notifications/preferences" onClick={onClose}>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <ScrollArea className="h-[400px]">
        {error ? (
          <div className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive opacity-50" />
            <p className="text-foreground font-medium mb-2">Failed to load notifications</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshNotifications()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Retrying...' : 'Retry'}
            </Button>
          </div>
        ) : isLoading || isRefreshing ? (
          <div className="p-8 text-center text-muted-foreground">
            <RefreshCw className="h-6 w-6 mx-auto mb-2 animate-spin" />
            <p>Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No notifications yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              We'll notify you when something happens
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => {
              // Safe icon lookup with type guard
              const Icon =
                notification.type && notificationIcons[notification.type as NotificationType]
                  ? notificationIcons[notification.type as NotificationType]
                  : MessageSquare

              // Validate notification structure
              if (!notification.id || !notification.title) {
                return null
              }

              const isNavigating = navigatingId === notification.id
              const isDisabled = isNavigating || markingAllAsRead

              return (
                <button
                  key={notification.id}
                  onClick={() =>
                    handleNotificationClick(notification.id, notification.link || null)
                  }
                  disabled={isDisabled}
                  className={`w-full p-4 text-left hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    !notification.is_read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    <div
                      className={`flex-shrink-0 ${!notification.is_read ? 'text-brand-primary' : 'text-muted-foreground'}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <p
                          className={`text-sm font-medium flex-1 ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}
                        >
                          <span className="inline-flex items-center gap-2">
                            {notification.title || 'Notification'}
                            {notification.batch_count && notification.batch_count > 1 && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] font-medium uppercase"
                              >
                                ×{notification.batch_count}
                              </Badge>
                            )}
                          </span>
                        </p>
                        {isNavigating && (
                          <Loader2 className="h-4 w-4 text-muted-foreground animate-spin flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message || ''}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatNotificationDate(notification.created_at)}
                      </p>
                    </div>
                    {!notification.is_read && !isNavigating && (
                      <div className="flex-shrink-0">
                        <div className="h-2 w-2 rounded-full bg-brand-primary" />
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {notifications.length > 0 && (
        <>
          <Separator />
          <div className="p-2">
            <Link href="/notifications" onClick={onClose}>
              <Button variant="ghost" className="w-full" size="sm">
                View all notifications
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
