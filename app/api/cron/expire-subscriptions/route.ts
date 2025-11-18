import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleAPIError, createSuccessResponse } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'
import { protectCronRoute } from '@/lib/utils/cron-auth'

// Force dynamic rendering for cron routes
export const dynamic = 'force-dynamic'

// GET /api/cron/expire-subscriptions - Cron job to expire subscriptions and hide profiles
export const GET = withRateLimit(async function GET(request: NextRequest) {
  const logger = createAPILogger('GET', '/api/cron/expire-subscriptions')
  try {
    // Verify cron authentication
    const authError = protectCronRoute(request)
    if (authError) return authError

    const supabase = await createClient()

    // Call the function to update expired subscriptions
    const { data: expiredData, error: expiredError } = await supabase.rpc(
      'update_expired_subscriptions'
    )

    if (expiredError) {
      logger.error('Error updating expired subscriptions:', expiredError)
      throw expiredError
    }

    // Call the function to hide profiles past grace period
    const { data: hiddenData, error: hiddenError } = await supabase.rpc(
      'hide_expired_artist_profiles'
    )

    if (hiddenError) {
      logger.error('Error hiding expired profiles:', hiddenError)
      throw hiddenError
    }

    logger.info(`Cron job completed: ${expiredData || 0} expired, ${hiddenData || 0} hidden`)

    return createSuccessResponse(
      {
        expired_count: expiredData || 0,
        hidden_count: hiddenData || 0,
      },
      {
        message: 'Subscription expiry cron job completed successfully',
      }
    )
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/cron/expire-subscriptions' })
  }
}) // Cron jobs use CRON preset automatically
