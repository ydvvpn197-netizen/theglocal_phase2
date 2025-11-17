import { logger } from '@/lib/utils/logger'
import { SupabaseClient } from '@supabase/supabase-js'
import { NotificationType } from '@/lib/types/notifications'

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string
  actorId?: string
  entityId?: string
  entityType?: string
}

/**
 * Creates a notification in the database
 */
export async function createNotification(
  supabase: SupabaseClient,
  params: CreateNotificationParams
) {
  const { data, error } = await supabase.rpc('create_notification', {
    p_user_id: params.userId,
    p_type: params.type,
    p_title: params.title,
    p_message: params.message,
    p_link: params.link || null,
    p_actor_id: params.actorId || null,
    p_entity_id: params.entityId || null,
    p_entity_type: params.entityType || null,
  })

  if (error) {
    logger.error('Error creating notification:', error)
    return null
  }

  return data
}

/**
 * Generates a notification message based on type and context
 */
export function getNotificationMessage(
  type: NotificationType,
  context: Record<string, unknown>
): { title: string; message: string } {
  switch (type) {
    case 'comment_on_post':
      return {
        title: 'New comment on your post',
        message: `${context.actorName} commented on "${context.postTitle}"`,
      }
    case 'comment_reply':
      return {
        title: 'Reply to your comment',
        message: `${context.actorName} replied to your comment`,
      }
    case 'post_upvote':
      return {
        title: 'Your post was upvoted',
        message: `${context.actorName} upvoted your post "${context.postTitle}"`,
      }
    case 'comment_upvote':
      return {
        title: 'Your comment was upvoted',
        message: `${context.actorName} upvoted your comment`,
      }
    case 'booking_update':
      return {
        title: 'Booking status updated',
        message: `Your booking with ${context.artistName} has been ${context.status}`,
      }
    case 'community_invite':
      return {
        title: 'Community invitation',
        message: `You've been invited to join ${context.communityName}`,
      }
    case 'artist_response':
      return {
        title: 'Artist response',
        message: `${context.artistName} sent you a message about your booking`,
      }
    case 'event_reminder':
      return {
        title: 'Event reminder',
        message: `${context.eventName} is happening ${context.when}`,
      }
    case 'community_role_change':
      return {
        title: 'Your community role changed',
        message: `You are now ${context.newRole} in ${context.communityName}`,
      }
    case 'direct_message': {
      const unreadCount = typeof context.unreadCount === 'number' ? context.unreadCount : 1
      return {
        title: unreadCount > 1 ? `${unreadCount} new messages` : 'New message',
        message:
          unreadCount > 1
            ? `${context.actorName} sent you ${unreadCount} messages`
            : `${context.actorName}: ${context.messagePreview}`,
      }
    }
    case 'booking_message': {
      const unreadCount = typeof context.unreadCount === 'number' ? context.unreadCount : 1
      return {
        title: unreadCount > 1 ? `${unreadCount} new booking messages` : 'New booking message',
        message:
          unreadCount > 1
            ? `${context.actorName} sent ${unreadCount} messages about your booking`
            : `${context.actorName}: ${context.messagePreview}`,
      }
    }
    case 'booking_request':
      return {
        title: 'New booking request',
        message: `${context.actorName} requested a booking with you`,
      }
    case 'mention':
      return {
        title: 'You were mentioned',
        message: `${context.actorName} mentioned you in "${context.postTitle || 'a post'}"`,
      }
    case 'moderation_action':
      return {
        title: 'Moderation action',
        message: context.action
          ? `Your content was ${context.action}`
          : 'A moderation action was taken on your content',
      }
    default:
      return {
        title: 'New notification',
        message: 'You have a new notification',
      }
  }
}

/**
 * Checks if a user should receive a notification based on preferences
 *
 * This function checks:
 * - User's notification type preferences (e.g., comments, mentions, etc.)
 * - Quiet hours (if enabled, notifications are paused except for critical types)
 * - All preferences are checked in the database function should_send_notification
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to check preferences for
 * @param type - Notification type to check
 * @returns Promise<boolean> - true if notification should be sent, false otherwise
 */
export async function shouldSendNotification(
  supabase: SupabaseClient,
  userId: string,
  type: NotificationType
): Promise<boolean> {
  const { data, error } = await supabase.rpc('should_send_notification', {
    p_user_id: userId,
    p_notification_type: type,
  })

  if (error) {
    logger.error('Error checking notification preferences:', error)
    // Default to sending notification if we can't check preferences
    return true
  }

  // The database function handles:
  // - Notification type preferences
  // - Quiet hours checking (respects timezone)
  // - Critical notification exceptions (event reminders, subscription updates)
  return data === true
}

/**
 * Validates a notification link URL
 * Only allows internal paths (relative URLs starting with /)
 * or absolute URLs to the same domain
 */
export function isValidNotificationLink(link: string | null | undefined): boolean {
  if (!link || typeof link !== 'string') {
    return false
  }

  // Allow relative paths (internal navigation)
  if (link.startsWith('/')) {
    // Validate that it's a valid path (not javascript: or data:)
    try {
      // Check if it's a valid URL path
      if (link.includes('://')) {
        return false // External URLs with protocol
      }
      // Allow relative paths that don't start with dangerous protocols
      if (link.match(/^(javascript|data|vbscript|file):/i)) {
        return false
      }
      return true
    } catch {
      return false
    }
  }

  // Allow absolute URLs to the same domain
  try {
    const url = new URL(link)
    // Only allow http/https
    if (!['http:', 'https:'].includes(url.protocol)) {
      return false
    }
    // Check if it's the same origin (for security)
    if (typeof window !== 'undefined') {
      const currentOrigin = window.location.origin
      return url.origin === currentOrigin
    }
    // Server-side: allow if it's theglocal.in domain
    return url.hostname === 'theglocal.in' || url.hostname.endsWith('.theglocal.in')
  } catch {
    return false
  }
}

/**
 * Normalizes a notification link for safe navigation
 * Converts absolute URLs to relative paths when possible
 */
export function normalizeNotificationLink(link: string | null | undefined): string | null {
  if (!link || typeof link !== 'string') {
    return null
  }

  // If it's already a relative path, return as-is (after validation)
  if (link.startsWith('/')) {
    if (isValidNotificationLink(link)) {
      return link
    }
    return null
  }

  // Try to convert absolute URL to relative path
  try {
    const url = new URL(link)
    // If it's the same origin, return the pathname
    if (typeof window !== 'undefined') {
      const currentOrigin = window.location.origin
      if (url.origin === currentOrigin) {
        return url.pathname + url.search + url.hash
      }
    }
    // Server-side: check if it's theglocal.in domain
    if (url.hostname === 'theglocal.in' || url.hostname.endsWith('.theglocal.in')) {
      return url.pathname + url.search + url.hash
    }
  } catch {
    // Invalid URL, return null
  }

  return null
}
