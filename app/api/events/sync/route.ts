import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncEvents } from '@/lib/services/event-sync-service'
import { protectCronRoute } from '@/lib/utils/cron-auth'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

/**
 * GET /api/events/sync - Cron job to sync events from all platforms
 *
 * This endpoint is called by Vercel Cron every 2 hours
 * Requires CRON_SECRET for authentication (in production)
 */
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  const logger = createAPILogger('GET', '/api/events/sync')
  try {
    // Verify cron authentication
    const authError = protectCronRoute(_request)
    if (authError) return authError

    const supabase = await createClient()

    // Get list of cities with active communities
    const { data: communities, error: communitiesError } = await supabase
      .from('communities')
      .select('location_city')
      .limit(100)

    if (communitiesError) {
      logger.error('Error fetching communities', communitiesError)
      return NextResponse.json({ error: 'Failed to fetch cities' }, { status: 500 })
    }

    // Get unique cities
    const cities = Array.from(
      new Set(
        communities?.map((c) => c.location_city).filter(Boolean) || [
          'Mumbai',
          'Delhi',
          'Bengaluru',
          'Hyderabad',
          'Pune',
        ]
      )
    )

    logger.info(`Starting event sync for ${cities.length} cities`, { cities })

    // Sync events from all platforms
    const syncStats = await syncEvents(cities)

    return NextResponse.json({
      success: syncStats.success,
      message: `Synced events for ${cities.length} cities`,
      stats: {
        totalFetched: syncStats.totalFetched,
        aiProcessed: syncStats.aiProcessed,
        inserted: syncStats.inserted,
        updated: syncStats.updated,
        duration: syncStats.duration,
        cities: syncStats.cities.length,
        byPlatform: syncStats.byPlatform,
        byCity: syncStats.byCity,
        errors: syncStats.errors.length > 0 ? syncStats.errors : undefined,
      },
    })
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/events/sync' })
  }
})

/**
 * POST /api/events/sync - Manual sync trigger (for testing/admin)
 *
 * Body: { cities?: string[] }
 */
export const POST = withRateLimit(async function POST(_request: NextRequest) {
  const logger = createAPILogger('POST', '/api/events/sync')
  try {
    // TODO: Add admin authentication
    const body = await _request.json()
    const cities = body.cities || ['Mumbai', 'Delhi', 'Bengaluru']

    logger.info('Manual sync triggered', { cities })

    const syncStats = await syncEvents(cities)

    return NextResponse.json({
      success: syncStats.success,
      message: `Manually synced ${cities.length} cities`,
      stats: syncStats,
    })
  } catch (error) {
    return handleAPIError(error, { method: 'POST', path: '/api/events/sync' })
  }
})
