import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { protectCronRoute } from '@/lib/utils/cron-auth'
import type { Json } from '@/lib/types/database.types'
import { handleAPIError, createSuccessResponse } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

// Force dynamic rendering - required for cron endpoints
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET /api/cron/handle-grace-period - Handle subscription grace periods
// This should be called daily via Vercel Cron Jobs
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  const logger = createAPILogger('GET', '/api/cron/handle-grace-period')
  try {
    // Verify cron authentication
    const authError = protectCronRoute(_request)
    if (authError) return authError

    const supabase = await createClient()

    // Get artists in grace period
    const { data: gracePeriodArtists, error: graceError } = await supabase
      .from('artists')
      .select('*')
      .eq('subscription_status', 'grace_period')
      .not('subscription_grace_period', 'is', null)

    if (graceError) {
      logger.error('Error fetching grace period artists', graceError)
      return NextResponse.json({ error: 'Failed to fetch grace period artists' }, { status: 500 })
    }

    let processedCount = 0
    let expiredCount = 0
    let reminderSentCount = 0
    const errors: string[] = []

    // Process each artist in grace period
    for (const artist of gracePeriodArtists || []) {
      try {
        const gracePeriodStart = new Date(artist.subscription_grace_period)
        const daysInGracePeriod = Math.floor(
          (Date.now() - gracePeriodStart.getTime()) / (1000 * 60 * 60 * 24)
        )

        // Day 3: Send first reminder
        if (daysInGracePeriod === 3) {
          await sendGracePeriodReminder(artist, 'first', supabase)
          reminderSentCount++
        }
        // Day 6: Send final warning
        else if (daysInGracePeriod === 6) {
          await sendGracePeriodReminder(artist, 'final', supabase)
          reminderSentCount++
        }
        // Day 7: Expire grace period
        else if (daysInGracePeriod >= 7) {
          await expireGracePeriod(artist, supabase)
          expiredCount++
        }

        processedCount++
      } catch (error) {
        logger.warn('Error processing artist grace period', { error, artistId: artist.id })
        // Continue processing other artists
      }
    }

    // Get artists with failed payments that need grace period
    const { data: failedPaymentArtists, error: failedError } = await supabase
      .from('artists')
      .select('*')
      .eq('subscription_status', 'payment_failed')
      .is('subscription_grace_period', null)

    if (!failedError && failedPaymentArtists) {
      for (const artist of failedPaymentArtists) {
        try {
          // Start grace period for artists with failed payments
          await supabase
            .from('artists')
            .update({
              subscription_status: 'grace_period',
              subscription_grace_period: new Date().toISOString(),
            })
            .eq('id', artist.id)

          // Send initial grace period notification
          await sendGracePeriodReminder(artist, 'initial', supabase)
          reminderSentCount++
        } catch (error) {
          const errorMsg = `Failed to start grace period for artist ${artist.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
          errors.push(errorMsg)
          logger.error('Failed to start grace period', error instanceof Error ? error : undefined, {
            artistId: artist.id,
          })
        }
      }
    }

    return createSuccessResponse(
      {
        processed: processedCount,
        expired: expiredCount,
        remindersSent: reminderSentCount,
        errors: errors.length > 0 ? errors : undefined,
      },
      {
        message: 'Grace period processing completed',
      }
    )
  } catch (error) {
    return handleAPIError(error, {
      method: 'GET',
      path: '/api/cron/handle-grace-period',
    })
  }
}) // Cron jobs use CRON preset automatically

/**
 * Send grace period reminder notification
 */
interface ArtistWithGracePeriod {
  id: string
  subscription_grace_period: string | null
  [key: string]: unknown
}

async function sendGracePeriodReminder(
  artist: ArtistWithGracePeriod,
  type: 'initial' | 'first' | 'final',
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const logger = createAPILogger('GET', '/api/cron/handle-grace-period')
  const reminderMessages = {
    initial: {
      subject: 'Payment Failed - Grace Period Started',
      message:
        'Your subscription payment failed. You have 7 days to update your payment method before your artist profile becomes inactive.',
    },
    first: {
      subject: 'Payment Reminder - 4 Days Left',
      message:
        'This is a reminder that your subscription payment failed. You have 4 days left to update your payment method.',
    },
    final: {
      subject: 'Final Warning - 1 Day Left',
      message:
        "This is your final warning. Your artist profile will become inactive tomorrow if you don't update your payment method.",
    },
  }

  const reminder = reminderMessages[type]

  // Log the reminder (in a real implementation, you'd send email/SMS)
  logger.info('Sending grace period reminder', {
    type,
    artistId: artist.id,
    subject: reminder.subject,
  })

  const reminderPayload: Json = {
    reminder_type: type,
    grace_period_start: artist.subscription_grace_period,
  }

  // Create notification record
  await supabase.from('notifications').insert({
    user_id: artist.id,
    type: 'subscription_reminder',
    title: reminder.subject,
    message: reminder.message,
    data: reminderPayload,
  })

  // In a real implementation, you would:
  // 1. Send email via Resend
  // 2. Send SMS if phone number available
  // 3. Send push notification if user has app
}

/**
 * Expire grace period and deactivate artist
 */
async function expireGracePeriod(
  artist: ArtistWithGracePeriod,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const logger = createAPILogger('GET', '/api/cron/handle-grace-period')
  // Update artist status
  await supabase
    .from('artists')
    .update({
      subscription_status: 'expired',
      subscription_grace_period: null,
      subscription_expired_at: new Date().toISOString(),
    })
    .eq('id', artist.id)

  // Create notification
  const expirationPayload: Json = {
    grace_period_start: artist.subscription_grace_period,
    expired_at: new Date().toISOString(),
  }

  await supabase.from('notifications').insert({
    user_id: artist.id,
    type: 'subscription_expired',
    title: 'Subscription Expired',
    message:
      'Your artist subscription has expired due to failed payment. Your profile is now inactive.',
    data: expirationPayload,
  })

  // Log the expiration
  logger.info('Artist grace period expired, profile deactivated', { artistId: artist.id })
}
