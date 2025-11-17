import { NextRequest, NextResponse } from 'next/server'
import { cleanupExpiredEvents } from '@/lib/services/event-sync-service'
import { protectCronRoute } from '@/lib/utils/cron-auth'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

/**
 * GET /api/events/cleanup - Cron job to clean up expired events
 *
 * This endpoint is called by Vercel Cron daily at 3 AM
 * Deletes events where expires_at < NOW() (24 hours after event date)
 * Requires CRON_SECRET for authentication
 */
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  const logger = createAPILogger('GET', '/api/events/cleanup')
  try {
    // Verify cron authentication
    const authError = protectCronRoute(_request)
    if (authError) return authError

    logger.info('Starting expired events cleanup')
    const startTime = Date.now()

    // Run cleanup function
    const deletedCount = await cleanupExpiredEvents()

    const duration = Date.now() - startTime

    logger.info('Cleanup complete', { deletedCount, duration })

    return createSuccessResponse(
      {
        deletedCount,
        duration,
        timestamp: new Date().toISOString(),
      },
      {
        message: `Cleaned up ${deletedCount} expired events`,
      }
    )
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/events/cleanup' })
  }
})

/**
 * POST /api/events/cleanup - Manual cleanup trigger (for testing/admin)
 */
export const POST = withRateLimit(async function POST(_request: NextRequest) {
  const logger = createAPILogger('POST', '/api/events/cleanup')
  try {
    // TODO: Add admin authentication
    logger.info('Manual cleanup triggered')

    const deletedCount = await cleanupExpiredEvents()

    return createSuccessResponse(
      {
        deletedCount,
        timestamp: new Date().toISOString(),
      },
      {
        message: `Manually cleaned up ${deletedCount} expired events`,
      }
    )
  } catch (error) {
    return handleAPIError(error, { method: 'POST', path: '/api/events/cleanup' })
  }
})
