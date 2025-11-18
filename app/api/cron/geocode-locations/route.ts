import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { protectCronRoute } from '@/lib/utils/cron-auth'
import { processGeocodeQueue, queueNullCoordinates, getGeocodingStats } from '@/lib/utils/geocoding'
import { handleAPIError, createSuccessResponse } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

// Force dynamic rendering - required for cron endpoints
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET /api/cron/geocode-locations - Process geocoding queue and queue new records
// This should be called periodically via Vercel Cron Jobs (every 6 hours)
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  const logger = createAPILogger('GET', '/api/cron/geocode-locations')
  try {
    // Verify cron authentication
    const authError = protectCronRoute(_request)
    if (authError) return authError

    const supabase = await createClient()

    logger.info('Starting geocoding batch job')

    // Step 1: Find and queue records with NULL coordinates
    logger.info('Step 1: Queuing records with NULL coordinates')
    const tablesToProcess = [
      { name: 'events', column: 'location_city' },
      { name: 'users', column: 'location_city' },
      { name: 'communities', column: 'location_city' },
      { name: 'posts', column: 'location_city' },
      { name: 'artists', column: 'location_city' },
      { name: 'polls', column: 'location_city' },
    ]

    let totalQueued = 0
    for (const table of tablesToProcess) {
      const queued = await queueNullCoordinates(supabase, table.name, table.column, 100)
      totalQueued += queued
      logger.info('Queued records', { count: queued, table: table.name })
    }

    // Step 2: Process the geocoding queue
    logger.info('Step 2: Processing geocoding queue')
    const queueStats = await processGeocodeQueue(
      supabase,
      50, // batch size
      100 // 100ms delay between requests (50 requests/minute)
    )

    logger.info('Queue processing complete', {
      total: queueStats.total,
      successful: queueStats.successful,
      failed: queueStats.failed,
      rateLimited: queueStats.rateLimited,
    })

    // Step 3: Get current statistics
    const allStats = await getGeocodingStats(supabase)

    return createSuccessResponse(
      {
        summary: {
          recordsQueued: totalQueued,
          queueProcessed: queueStats.total,
          successful: queueStats.successful,
          failed: queueStats.failed,
          rateLimited: queueStats.rateLimited,
        },
        queueStatus: {
          pending: allStats.pending,
          processing: allStats.processing,
          completed: allStats.completed,
          failed: allStats.failed,
        },
        byTable: allStats.byTable,
      },
      {
        message: 'Geocoding batch job completed',
      }
    )
  } catch (error) {
    return handleAPIError(error, {
      method: 'GET',
      path: '/api/cron/geocode-locations',
    })
  }
}) // Cron jobs use CRON preset automatically
