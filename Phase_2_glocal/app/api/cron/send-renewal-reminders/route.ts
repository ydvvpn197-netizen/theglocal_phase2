import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  sendSubscriptionRenewalReminder,
  sendSubscriptionExpiredNotification,
} from '@/lib/integrations/resend'
import { PRICING } from '@/lib/utils/constants'

// GET /api/cron/send-renewal-reminders - Cron job to send subscription renewal reminders
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
      console.error('Error fetching artists needing renewal reminders:', renewalError)
      errors.push(`Renewal query error: ${renewalError.message}`)
    } else if (artistsNeedingReminders && artistsNeedingReminders.length > 0) {
      console.log(`Found ${artistsNeedingReminders.length} artists needing renewal reminders`)

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
          console.log(
            `Sent renewal reminder to ${artist.stage_name} (${artist.artist_email})`
          )
        } catch (error) {
          console.error(
            `Error sending renewal reminder to ${artist.artist_email}:`,
            error
          )
          errors.push(
            `Failed to send to ${artist.artist_email}: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
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
      console.error('Error fetching artists needing expiry notifications:', expiryError)
      errors.push(`Expiry query error: ${expiryError.message}`)
    } else if (artistsNeedingExpiry && artistsNeedingExpiry.length > 0) {
      console.log(`Found ${artistsNeedingExpiry.length} artists needing expiry notifications`)

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
          console.log(
            `Sent expiry notification to ${artist.stage_name} (${artist.artist_email})`
          )
        } catch (error) {
          console.error(
            `Error sending expiry notification to ${artist.artist_email}:`,
            error
          )
          errors.push(
            `Failed to send expiry to ${artist.artist_email}: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        }
      }
    }

    console.log(
      `Renewal reminders cron completed: ${renewalRemindersSent} reminders sent, ${expiryNotificationsSent} expiry notifications sent`
    )

    return NextResponse.json({
      success: true,
      renewal_reminders_sent: renewalRemindersSent,
      expiry_notifications_sent: expiryNotificationsSent,
      errors: errors.length > 0 ? errors : undefined,
      message: 'Renewal reminders cron job completed successfully',
    })
  } catch (error) {
    console.error('Renewal reminders cron job error:', error)
    return NextResponse.json(
      {
        error: 'Cron job failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

