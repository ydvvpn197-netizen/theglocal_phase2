import { NotificationType, NotificationWithActor } from '@/lib/types/notifications'

export type NotificationFilter = 'all' | 'unread' | 'read'

export interface NotificationPageInfo {
  hasMore: boolean
  nextCursor: string | null
  limit: number
  filter: NotificationFilter
}

export interface NotificationListResponse {
  notifications: NotificationWithActor[]
  pageInfo: NotificationPageInfo
}

export interface NotificationSummaryResponse {
  unreadCount: number
  latestNotification: { id: string; created_at: string } | null
}

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (filter: NotificationFilter) => ['notifications', 'list', filter] as const,
  summary: () => ['notifications', 'summary'] as const,
}

export function isValidNotificationFilter(
  value: string | null | undefined
): value is NotificationFilter {
  return value === 'all' || value === 'unread' || value === 'read'
}

export type NotificationActionType = Extract<
  NotificationType,
  | 'comment_on_post'
  | 'comment_reply'
  | 'post_upvote'
  | 'poll_upvote'
  | 'comment_upvote'
  | 'booking_update'
  | 'booking_request'
  | 'community_invite'
  | 'artist_response'
  | 'event_reminder'
  | 'community_role_change'
  | 'direct_message'
  | 'booking_message'
  | 'subscription_reminder'
  | 'subscription_update'
  | 'subscription_expired'
>
