import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { protectCronRoute } from '@/lib/utils/cron-auth'
import { getSubscription } from '@/lib/integrations/razorpay'
import { handleAPIError, createSuccessResponse } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

// Force dynamic rendering - required for cron endpoints
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET /api/cron/sync-subscription-status - Sync subscription status from Razorpay
// This should be called periodically via Vercel Cron Jobs
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  const logger = createAPILogger('GET', '/api/cron/sync-subscription-status')
  try {
    // Verify cron authentication
    const authError = protectCronRoute(_request)
    if (authError) return authError

    const supabase = await createClient()

    // Get all active and trial subscriptions with Razorpay subscription IDs
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('subscriptions')
      .select('*')
      .in('status', ['active', 'trial', 'paused'])
      .not('razorpay_subscription_id', 'is', null)

    if (subscriptionsError) {
      logger.error('Error fetching subscriptions', subscriptionsError)
      return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 })
    }

    let syncedCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Sync each subscription
    for (const subscription of subscriptions || []) {
      try {
        // Fetch latest status from Razorpay
        const razorpaySubscription = await getSubscription(subscription.razorpay_subscription_id!)

        // Map Razorpay status to our status
        const newStatus =
          razorpaySubscription.status === 'authenticated' ? 'trial' : razorpaySubscription.status

        // Update subscription if status changed
        if (newStatus !== subscription.status) {
          await supabase
            .from('subscriptions')
            .update({
              status: newStatus,
              current_start: razorpaySubscription.current_start
                ? new Date(razorpaySubscription.current_start * 1000).toISOString()
                : subscription.current_start,
              current_end: razorpaySubscription.current_end
                ? new Date(razorpaySubscription.current_end * 1000).toISOString()
                : subscription.current_end,
              next_billing_date: razorpaySubscription.charge_at
                ? new Date(razorpaySubscription.charge_at * 1000).toISOString()
                : subscription.next_billing_date,
            })
            .eq('id', subscription.id)

          // Update artist status if needed
          if (['cancelled', 'completed', 'expired'].includes(newStatus)) {
            await supabase
              .from('artists')
              .update({ subscription_status: newStatus })
              .eq('id', subscription.artist_id)
          }
        }

        syncedCount++
      } catch (error) {
        errorCount++
        errors.push(
          `Subscription ${subscription.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
        logger.warn('Error syncing subscription', { subscriptionId: subscription.id, error })
      }
    }

    // Check for expired trials
    const { data: trialSubscriptions } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'trial')
      .lt('trial_end', new Date().toISOString())

    if (trialSubscriptions && trialSubscriptions.length > 0) {
      for (const trial of trialSubscriptions) {
        // Mark trial as expired if not converted
        await supabase.from('subscriptions').update({ status: 'expired' }).eq('id', trial.id)

        await supabase
          .from('artists')
          .update({ subscription_status: 'expired' })
          .eq('id', trial.artist_id)
      }
    }

    return createSuccessResponse(
      {
        total: subscriptions?.length || 0,
        synced: syncedCount,
        errors: errorCount,
        expiredTrials: trialSubscriptions?.length || 0,
        errorMessages: errors.length > 0 ? errors : undefined,
      },
      {
        message: 'Subscription sync completed',
      }
    )
  } catch (error) {
    return handleAPIError(error, {
      method: 'GET',
      path: '/api/cron/sync-subscription-status',
    })
  }
}) // Cron jobs use CRON preset automatically
