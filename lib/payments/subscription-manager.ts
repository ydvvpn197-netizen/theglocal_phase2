/**
 * Subscription Manager
 * Handles subscription lifecycle and grace period management
 */

import { logger } from '@/lib/utils/logger'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/types/database.types'
export interface SubscriptionConfig {
  gracePeriodDays: number
  reminderDays: number[]
  maxRetries: number
  retryIntervalHours: number
}

const DEFAULT_CONFIG: SubscriptionConfig = {
  gracePeriodDays: 7,
  reminderDays: [3, 6], // Send reminders on day 3 and day 6
  maxRetries: 3,
  retryIntervalHours: 24,
}

export class SubscriptionManager {
  private config: SubscriptionConfig

  constructor(config: Partial<SubscriptionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Start grace period for failed payment
   */
  async startGracePeriod(artistId: string, reason: string): Promise<boolean> {
    try {
      const supabase = await createClient()

      const { error } = await supabase
        .from('artists')
        .update({
          subscription_status: 'grace_period',
          subscription_grace_period: new Date().toISOString(),
          subscription_grace_reason: reason,
        })
        .eq('id', artistId)

      if (error) {
        logger.error('Error starting grace period:', error)
        return false
      }

      // Send initial grace period notification
      await this.sendGracePeriodNotification(artistId, 'started')

      return true
    } catch (error) {
      logger.error('Failed to start grace period:', error)
      return false
    }
  }

  /**
   * Check if grace period should be extended
   */
  async checkGracePeriodStatus(artistId: string): Promise<{
    inGracePeriod: boolean
    daysRemaining: number
    shouldExpire: boolean
  }> {
    try {
      const supabase = await createClient()

      const { data: artist, error } = await supabase
        .from('artists')
        .select('subscription_status, subscription_grace_period')
        .eq('id', artistId)
        .single()

      if (error || !artist) {
        return { inGracePeriod: false, daysRemaining: 0, shouldExpire: false }
      }

      if (artist.subscription_status !== 'grace_period' || !artist.subscription_grace_period) {
        return { inGracePeriod: false, daysRemaining: 0, shouldExpire: false }
      }

      const gracePeriodStart = new Date(artist.subscription_grace_period)
      const daysInGracePeriod = Math.floor(
        (Date.now() - gracePeriodStart.getTime()) / (1000 * 60 * 60 * 24)
      )
      const daysRemaining = this.config.gracePeriodDays - daysInGracePeriod

      return {
        inGracePeriod: true,
        daysRemaining: Math.max(0, daysRemaining),
        shouldExpire: daysInGracePeriod >= this.config.gracePeriodDays,
      }
    } catch (error) {
      logger.error('Failed to check grace period status:', error)
      return { inGracePeriod: false, daysRemaining: 0, shouldExpire: false }
    }
  }

  /**
   * Send grace period reminder
   */
  async sendGracePeriodReminder(
    artistId: string,
    reminderType: 'first' | 'final'
  ): Promise<boolean> {
    try {
      const supabase = await createClient()

      // Get artist details
      const { data: artist, error } = await supabase
        .from('artists')
        .select('*')
        .eq('id', artistId)
        .single()

      if (error || !artist) {
        return false
      }

      const gracePeriodStart = new Date(artist.subscription_grace_period!)
      const daysInGracePeriod = Math.floor(
        (Date.now() - gracePeriodStart.getTime()) / (1000 * 60 * 60 * 24)
      )

      const reminderMessages = {
        first: {
          title: 'Payment Reminder - Update Required',
          message: `Your subscription payment failed. You have ${this.config.gracePeriodDays - daysInGracePeriod} days left to update your payment method.`,
        },
        final: {
          title: 'Final Warning - Payment Required',
          message:
            "This is your final warning. Your artist profile will become inactive tomorrow if you don't update your payment method.",
        },
      }

      const reminder = reminderMessages[reminderType]

      // Create notification
      const reminderPayload: Json = {
        reminder_type: reminderType,
        grace_period_start: artist.subscription_grace_period,
        days_remaining: this.config.gracePeriodDays - daysInGracePeriod,
      }

      await supabase.from('notifications').insert({
        user_id: artistId,
        type: 'subscription_reminder',
        title: reminder.title,
        message: reminder.message,
        data: reminderPayload,
      })

      // In production, you would also:
      // 1. Send email notification
      // 2. Send SMS if phone number available
      // 3. Send push notification

      return true
    } catch (error) {
      logger.error('Failed to send grace period reminder:', error)
      return false
    }
  }

  /**
   * Expire grace period and deactivate artist
   */
  async expireGracePeriod(artistId: string): Promise<boolean> {
    try {
      const supabase = await createClient()

      // Update artist status
      const { error } = await supabase
        .from('artists')
        .update({
          subscription_status: 'expired',
          subscription_grace_period: null,
          subscription_expired_at: new Date().toISOString(),
        })
        .eq('id', artistId)

      if (error) {
        logger.error('Error expiring grace period:', error)
        return false
      }

      // Send expiration notification
      await this.sendGracePeriodNotification(artistId, 'expired')

      return true
    } catch (error) {
      logger.error('Failed to expire grace period:', error)
      return false
    }
  }

  /**
   * Restore subscription after successful payment
   */
  async restoreSubscription(artistId: string, _paymentTransactionId: string): Promise<boolean> {
    try {
      const supabase = await createClient()

      // Update artist status
      const { error } = await supabase
        .from('artists')
        .update({
          subscription_status: 'active',
          subscription_grace_period: null,
          subscription_restored_at: new Date().toISOString(),
        })
        .eq('id', artistId)

      if (error) {
        logger.error('Error restoring subscription:', error)
        return false
      }

      // Send restoration notification
      await this.sendGracePeriodNotification(artistId, 'restored')

      return true
    } catch (error) {
      logger.error('Failed to restore subscription:', error)
      return false
    }
  }

  /**
   * Get artists in grace period
   */
  async getArtistsInGracePeriod(): Promise<unknown[]> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .eq('subscription_status', 'grace_period')
        .not('subscription_grace_period', 'is', null)

      if (error) {
        logger.error('Error fetching artists in grace period:', error)
        return []
      }

      return data || []
    } catch (error) {
      logger.error('Failed to get artists in grace period:', error)
      return []
    }
  }

  /**
   * Process grace period reminders
   */
  async processGracePeriodReminders(): Promise<{
    processed: number
    remindersSent: number
    expired: number
  }> {
    const artists = await this.getArtistsInGracePeriod()
    let processed = 0
    let remindersSent = 0
    let expired = 0

    for (const artist of artists) {
      try {
        // Type guard for artist
        if (!artist || typeof artist !== 'object') {
          logger.warn('Invalid artist record:', artist)
          continue
        }

        const artistRecord = artist as { id: string; subscription_grace_period?: string | Date }
        if (!artistRecord.id || typeof artistRecord.id !== 'string') {
          logger.warn('Artist record missing id:', artistRecord)
          continue
        }

        const status = await this.checkGracePeriodStatus(artistRecord.id)

        if (!status.inGracePeriod) {
          continue
        }

        if (!artistRecord.subscription_grace_period) {
          logger.warn('Artist missing subscription_grace_period:', artistRecord.id)
          continue
        }

        const gracePeriodStart = new Date(artistRecord.subscription_grace_period)
        const daysInGracePeriod = Math.floor(
          (Date.now() - gracePeriodStart.getTime()) / (1000 * 60 * 60 * 24)
        )

        // Check if we should send reminders
        if (this.config.reminderDays.includes(daysInGracePeriod)) {
          const reminderType = daysInGracePeriod === this.config.reminderDays[0] ? 'first' : 'final'
          await this.sendGracePeriodReminder(artistRecord.id, reminderType)
          remindersSent++
        }

        // Check if grace period should expire
        if (status.shouldExpire) {
          await this.expireGracePeriod(artistRecord.id)
          expired++
        }

        processed++
      } catch (error) {
        const artistId =
          artist && typeof artist === 'object' && 'id' in artist ? String(artist.id) : 'unknown'
        logger.error(`Failed to process grace period for artist ${artistId}:`, error)
      }
    }

    return { processed, remindersSent, expired }
  }

  /**
   * Send grace period notification
   */
  private async sendGracePeriodNotification(
    artistId: string,
    type: 'started' | 'expired' | 'restored'
  ): Promise<void> {
    try {
      const supabase = await createClient()

      const notifications = {
        started: {
          title: 'Payment Failed - Grace Period Started',
          message:
            'Your subscription payment failed. You have 7 days to update your payment method.',
        },
        expired: {
          title: 'Subscription Expired',
          message:
            'Your artist subscription has expired due to failed payment. Your profile is now inactive.',
        },
        restored: {
          title: 'Subscription Restored',
          message: 'Your subscription has been restored. Your artist profile is now active again.',
        },
      }

      const notification = notifications[type]

      const lifecyclePayload: Json = {
        grace_period_type: type,
        timestamp: new Date().toISOString(),
      }

      await supabase.from('notifications').insert({
        user_id: artistId,
        type: 'subscription_update',
        title: notification.title,
        message: notification.message,
        data: lifecyclePayload,
      })
    } catch (error) {
      logger.error('Failed to send grace period notification:', error)
    }
  }

  /**
   * Get subscription statistics
   */
  async getSubscriptionStats(): Promise<{
    total: number
    active: number
    gracePeriod: number
    expired: number
    failed: number
  }> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase.from('artists').select('subscription_status')

      if (error || !data) {
        return { total: 0, active: 0, gracePeriod: 0, expired: 0, failed: 0 }
      }

      const stats = data.reduce(
        (acc, artist) => {
          acc.total++

          switch (artist.subscription_status) {
            case 'active':
              acc.active++
              break
            case 'grace_period':
              acc.gracePeriod++
              break
            case 'expired':
              acc.expired++
              break
            case 'payment_failed':
              acc.failed++
              break
          }

          return acc
        },
        { total: 0, active: 0, gracePeriod: 0, expired: 0, failed: 0 }
      )

      return stats
    } catch (error) {
      logger.error('Failed to get subscription stats:', error)
      return { total: 0, active: 0, gracePeriod: 0, expired: 0, failed: 0 }
    }
  }
}

// Export singleton instance
export const subscriptionManager = new SubscriptionManager()
