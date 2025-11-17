import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  sendSubscriptionRenewalReminder,
  sendSubscriptionExpiredNotification,
} from '@/lib/integrations/resend'
import { PRICING } from '@/lib/utils/constants'
import { handleAPIError, createSuccessResponse } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'
import { protectCronRoute } from '@/lib/utils/cron-auth'

// GET /api/cron/send-renewal-reminders - Cron job to send subscription renewal reminders
export const GET = withRateLimit(async function GET(request: NextRequest) {
  const logger = createAPILogger('GET', '/api/cron/send-renewal-reminders')
  try {
    // Verify cron authentication
    const authError = protectCronRoute(request)
    if (authError) return authError

    const supabase = await createClient()

    let renewalRemindersSent = 0
    let expiryNotificationsSent = 0
    const errors: string[] = []

    // ============================================
    // SEND RENEWAL REMINDERS (3 days before)
    // ============================================

    const { data: artistsNeedingReminders, error: renewalError } = await supabase.rpc(
      'get_artists_needing_renewal_reminder'
    )

    if (renewalError) {
      logger.error('Error fetching artists needing renewal reminders:', renewalError)
      errors.push(`Renewal query error: ${renewalError.message}`)
    } else if (artistsNeedingReminders && artistsNeedingReminders.length > 0) {
      logger.info(`Found ${artistsNeedingReminders.length} artists needing renewal reminders`)

      for (const artist of artistsNeedingReminders) {
        try {
          // Calculate amount based on plan
          const amount =
            artist.subscription_plan === 'yearly'
              ? PRICING.ARTIST_SUBSCRIPTION_MONTHLY * 12
              : PRICING.ARTIST_SUBSCRIPTION_MONTHLY

          // Send renewal reminder email
          await sendSubscriptionRenewalReminder(
            artist.artist_email,
            artist.stage_name,
            new Date(artist.subscription_end_date).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
            amount
          )

          // Mark reminder as sent
          await supabase.rpc('mark_renewal_reminder_sent', {
            p_artist_id: artist.artist_id,
          })

          renewalRemindersSent++
          logger.info(`Sent renewal reminder to ${artist.stage_name} (${artist.artist_email})`)
        } catch (error) {
          errors.push(
            `Failed to send renewal reminder to ${artist.stage_name}: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
          logger.warn('Error sending renewal reminder', { artistId: artist.artist_id, error })
        }
      }
    }

    // ============================================
    // SEND EXPIRY NOTIFICATIONS
    // ============================================

    const { data: artistsNeedingExpiry, error: expiryError } = await supabase.rpc(
      'get_artists_needing_expiry_notification'
    )

    if (expiryError) {
      logger.error('Error fetching artists needing expiry notifications:', expiryError)
      errors.push(`Expiry query error: ${expiryError.message}`)
    } else if (artistsNeedingExpiry && artistsNeedingExpiry.length > 0) {
      logger.info(`Found ${artistsNeedingExpiry.length} artists needing expiry notifications`)

      for (const artist of artistsNeedingExpiry) {
        try {
          // Send expiry notification email
          await sendSubscriptionExpiredNotification(
            artist.artist_email,
            artist.stage_name,
            new Date(artist.grace_period_end_date).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          )

          // Mark notification as sent
          await supabase.rpc('mark_expiry_notification_sent', {
            p_artist_id: artist.artist_id,
          })

          expiryNotificationsSent++
          logger.info(`Sent expiry notification to ${artist.stage_name} (${artist.artist_email})`)
        } catch (error) {
          errors.push(
            `Failed to send expiry notification to ${artist.stage_name}: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
          logger.warn('Error sending expiry notification', { artistId: artist.artist_id, error })
        }
      }
    }

    return createSuccessResponse(
      {
        renewalRemindersSent,
        expiryNotificationsSent,
        errors: errors.length > 0 ? errors : undefined,
      },
      {
        message: 'Renewal reminders and expiry notifications processed',
      }
    )
  } catch (error) {
    return handleAPIError(error, {
      method: 'GET',
      path: '/api/cron/send-renewal-reminders',
    })
  }
}) // Cron jobs use CRON preset automatically
