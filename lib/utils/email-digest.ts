import { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'
import {
  Notification,
  NotificationPreferences,
  EmailDigestFrequency,
} from '@/lib/types/notifications'

/**
 * Email Digest Utility Functions
 *
 * These functions support the email digest feature for notifications.
 * The actual email sending implementation should be added separately.
 */

/**
 * Determines if an email digest should be sent based on user preferences and last digest time
 *
 * @param preferences - User's notification preferences
 * @param lastDigestSentAt - Timestamp of when the last digest was sent (null if never sent)
 * @returns boolean - true if digest should be sent, false otherwise
 */
export function shouldSendEmailDigest(
  preferences: NotificationPreferences,
  lastDigestSentAt: string | null
): boolean {
  // Check if email digest is enabled
  if (!preferences.email_digest_enabled) {
    return false
  }

  // If frequency is 'never', don't send
  if (preferences.email_digest_frequency === 'never') {
    return false
  }

  // If never sent before, send if enabled
  if (!lastDigestSentAt) {
    return true
  }

  const lastSent = new Date(lastDigestSentAt)
  const now = new Date()
  const hoursSinceLastDigest = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60)

  // Check frequency requirements
  switch (preferences.email_digest_frequency) {
    case 'daily':
      // Send if 24+ hours have passed
      return hoursSinceLastDigest >= 24
    case 'weekly':
      // Send if 7 days (168 hours) have passed
      return hoursSinceLastDigest >= 168
    default:
      return false
  }
}

/**
 * Collects notifications for email digest
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to collect notifications for
 * @param since - Timestamp to collect notifications since (defaults to 24 hours ago)
 * @returns Promise<Notification[]> - Array of notifications to include in digest
 */
export async function collectNotificationsForDigest(
  supabase: SupabaseClient,
  userId: string,
  since?: Date
): Promise<Notification[]> {
  try {
    const sinceDate = since || new Date(Date.now() - 24 * 60 * 60 * 1000) // Default: 24 hours ago

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', sinceDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(100) // Limit to prevent huge digests

    if (error) {
      logger.error('Error collecting notifications for digest:', error)
      return []
    }

    return (data || []) as Notification[]
  } catch (error) {
    logger.error('Error collecting notifications for digest:', error)
    return []
  }
}

/**
 * Groups notifications by type for digest formatting
 *
 * @param notifications - Array of notifications to group
 * @returns Record<string, Notification[]> - Notifications grouped by type
 */
export function groupNotificationsByType(
  notifications: Notification[]
): Record<string, Notification[]> {
  return notifications.reduce(
    (acc, notification) => {
      const type = notification.type
      if (!acc[type]) {
        acc[type] = []
      }
      acc[type].push(notification)
      return acc
    },
    {} as Record<string, Notification[]>
  )
}

/**
 * Formats notifications for email digest
 *
 * @param notifications - Array of notifications to format
 * @returns Formatted digest content (structure for future email template)
 */
export function formatEmailDigest(notifications: Notification[]): {
  totalCount: number
  groupedByType: Record<string, Notification[]>
  summary: string
} {
  const grouped = groupNotificationsByType(notifications)
  const totalCount = notifications.length

  // Generate summary text
  let summary = `You have ${totalCount} new notification${totalCount !== 1 ? 's' : ''}`
  if (totalCount > 0) {
    const typeCounts = Object.entries(grouped)
      .map(([type, notifs]) => `${notifs.length} ${type.replace(/_/g, ' ')}`)
      .join(', ')
    summary += `: ${typeCounts}`
  }

  return {
    totalCount,
    groupedByType: grouped,
    summary,
  }
}

/**
 * Gets users who should receive email digests
 *
 * @param supabase - Supabase client instance
 * @param frequency - Frequency to check for (daily, weekly)
 * @returns Promise<string[]> - Array of user IDs who should receive digests
 */
export async function getUsersForEmailDigest(
  supabase: SupabaseClient,
  frequency: EmailDigestFrequency
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('user_id')
      .eq('email_digest_enabled', true)
      .eq('email_digest_frequency', frequency)

    if (error) {
      logger.error('Error getting users for email digest:', error)
      return []
    }

    return (data || []).map((pref) => pref.user_id)
  } catch (error) {
    logger.error('Error getting users for email digest:', error)
    return []
  }
}

/**
 * Records that an email digest was sent
 *
 * Note: This assumes a table exists to track digest sending history.
 * If such a table doesn't exist, it should be created separately.
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID who received the digest
 * @param notificationCount - Number of notifications included in digest
 * @returns Promise<boolean> - true if recorded successfully
 */
export async function recordEmailDigestSent(
  _supabase: SupabaseClient,
  userId: string,
  notificationCount: number
): Promise<boolean> {
  try {
    // TODO: Create email_digest_history table if it doesn't exist
    // For now, this is a placeholder function
    logger.info(`Email digest sent to user ${userId} with ${notificationCount} notifications`)
    return true
  } catch (error) {
    logger.error('Error recording email digest sent:', error)
    return false
  }
}
