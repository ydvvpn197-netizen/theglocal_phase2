import { NextRequest, NextResponse } from 'next/server'
import { cleanupExpiredDrafts } from '@/lib/server/drafts/cleanup-expired'
import { handleAPIError, createSuccessResponse } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'
import { protectCronRoute } from '@/lib/utils/cron-auth'

// GET /api/cron/cleanup-drafts - Cron job to cleanup expired drafts (older than 7 days)
export const GET = withRateLimit(async function GET(request: NextRequest) {
  const logger = createAPILogger('GET', '/api/cron/cleanup-drafts')
  try {
    // Verify cron authentication
    const authError = protectCronRoute(request)
    if (authError) return authError

    const result = await cleanupExpiredDrafts()

    if (!result.success) {
      logger.error('Failed to cleanup expired drafts:', result.error)
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to cleanup expired drafts',
        },
        { status: 500 }
      )
    }

    logger.info(`Cron job completed: ${result.deletedCount} expired drafts deleted`)

    return createSuccessResponse(
      {
        deleted_count: result.deletedCount,
      },
      {
        message: `Cleaned up ${result.deletedCount} expired drafts`,
      }
    )
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/cron/cleanup-drafts' })
  }
}) // Cron jobs use CRON preset automatically
