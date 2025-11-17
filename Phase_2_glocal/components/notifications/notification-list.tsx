'use client'

import { logger } from '@/lib/utils/logger'
import { useMemo } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  MessageSquare,
  ThumbsUp,
  Calendar,
  Users,
  Music,
  Trash2,
  Check,
  Shield,
  MessageCircle,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { NotificationType } from '@/lib/types/notifications'
import { useNotifications } from '@/lib/context/notification-context'
import { useNotificationFeed } from '@/lib/hooks/use-notification-feed'
import Link from 'next/link'

interface NotificationListProps {
  filter?: 'all' | 'unread' | 'read'
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

export function NotificationList({ filter = 'all' }: NotificationListProps) {
  const { notifications, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
    useNotificationFeed({ filter })
  const { markAsRead, deleteNotification } = useNotifications()

  const handleMarkAsRead = async (notificationId: string) => {
    if (!notificationId) return
    try {
      await markAsRead(notificationId)
    } catch (error) {
      logger.error('Error marking notification as read:', error)
    }
  }

  const handleDelete = async (notificationId: string) => {
    if (!notificationId) return
    try {
      await deleteNotification(notificationId)
    } catch (error) {
      logger.error('Error deleting notification:', error)
    }
  }

  const uniqueNotifications = useMemo(() => notifications, [notifications])

  if (isError) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive opacity-50" />
          <p className="text-muted-foreground">Failed to load notifications</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-muted-foreground">Loading notifications...</p>
        </div>
      </div>
    )
  }

  if (uniqueNotifications.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No notifications</p>
          <p className="text-sm text-muted-foreground mt-1">
            {filter === 'unread' ? 'All caught up!' : 'We will notify you when something happens'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {uniqueNotifications.map((notification) => {
        // Validate notification structure
        if (!notification.id || !notification.title) {
          return null
        }

        // Safe icon lookup with type guard
        const Icon =
          notification.type && notificationIcons[notification.type as NotificationType]
            ? notificationIcons[notification.type as NotificationType]
            : MessageSquare

        return (
          <Card
            key={notification.id}
            className={`p-4 ${!notification.is_read ? 'border-brand-primary/50 bg-blue-50/30 dark:bg-blue-950/10' : ''}`}
          >
            <div className="flex gap-4">
              <div
                className={`flex-shrink-0 ${!notification.is_read ? 'text-brand-primary' : 'text-muted-foreground'}`}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h4
                      className={`font-medium ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}
                    >
                      <span className="inline-flex items-center gap-2">
                        {notification.title || 'Notification'}
                        {notification.batch_count && notification.batch_count > 1 && (
                          <Badge variant="secondary" className="text-[10px] font-medium uppercase">
                            ×{notification.batch_count}
                          </Badge>
                        )}
                      </span>
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.message || ''}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatNotificationDate(notification.created_at)}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <div className="h-2 w-2 rounded-full bg-brand-primary flex-shrink-0 mt-2" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  {notification.link && (
                    <Link href={notification.link}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkAsRead(notification.id)}
                      >
                        View
                      </Button>
                    </Link>
                  )}
                  {!notification.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Mark as read
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(notification.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )
      })}

      {hasNextPage && (
        <div className="flex justify-center pt-4">
          <Button onClick={() => fetchNextPage()} variant="outline" disabled={isFetchingNextPage}>
            {isFetchingNextPage ? 'Loading...' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  )
}
