import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { protectCronRoute } from '@/lib/utils/cron-auth'
import { handleAPIError } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

/**
 * GET /api/notifications/cleanup - Cron job to clean up expired notifications
 *
 * This endpoint is called by Vercel Cron daily at 3 AM
 * Deletes notifications where expires_at < NOW() (30 days after creation)
 * Requires CRON_SECRET for authentication
 */
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  const logger = createAPILogger('GET', '/api/notifications/cleanup')
  try {
    // Verify cron authentication
    const authError = protectCronRoute(_request)
    if (authError) return authError

    logger.info('Starting expired notifications cleanup')
    const startTime = Date.now()

    const supabase = await createClient()

    // Get count of expired notifications before deletion
    const { count: expiredCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .lt('expires_at', new Date().toISOString())

    // Delete expired notifications using the database function
    const { error } = await supabase.rpc('delete_expired_notifications')

    if (error) {
      logger.error(
        'Error cleaning up expired notifications:',
        error instanceof Error ? error : undefined
      )
      return NextResponse.json(
        {
          error: 'Failed to cleanup notifications',
          details: error.message,
        },
        { status: 500 }
      )
    }

    const duration = Date.now() - startTime

    logger.info('Cleanup complete', { deletedCount: expiredCount || 0, duration })

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${expiredCount || 0} expired notifications`,
      data: {
        deletedCount: expiredCount || 0,
        duration,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/notifications/cleanup' })
  }
})

/**
 * POST /api/notifications/cleanup - Manual cleanup trigger (for testing/admin)
 */
export const POST = withRateLimit(async function POST() {
  const logger = createAPILogger('POST', '/api/notifications/cleanup')
  try {
    // TODO: Add admin authentication
    logger.info('Manual notification cleanup triggered')

    const supabase = await createClient()

    // Get count of expired notifications before deletion
    const { count: expiredCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .lt('expires_at', new Date().toISOString())

    // Delete expired notifications using the database function
    const { error } = await supabase.rpc('delete_expired_notifications')

    if (error) {
      logger.error('Error cleaning up expired notifications', error)
      return NextResponse.json(
        {
          error: 'Failed to cleanup notifications',
          details: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Manually cleaned up ${expiredCount || 0} expired notifications`,
      data: {
        deletedCount: expiredCount || 0,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return handleAPIError(error, { method: 'POST', path: '/api/notifications/cleanup' })
  }
})
