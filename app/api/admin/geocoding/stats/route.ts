import { NextRequest } from 'next/server'
import { requireAdminOrThrow } from '@/lib/utils/require-admin'
import { getGeocodingStats } from '@/lib/utils/geocoding'
import { handleAPIError, createSuccessResponse } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'

// GET /api/admin/geocoding/stats - Get geocoding statistics for monitoring
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  const logger = createAPILogger('GET', '/api/admin/geocoding/stats')

  try {
    // Require admin authentication
    const { user, supabase } = await requireAdminOrThrow()

    logger.info('Fetching geocoding statistics', { userId: user.id })

    // Get geocoding queue statistics
    const queueStats = await getGeocodingStats(supabase)

    // Get records with NULL coordinates by table
    const tablesToCheck = [
      { name: 'events', column: 'location_city' },
      { name: 'users', column: 'location_city' },
      { name: 'communities', column: 'location_city' },
      { name: 'posts', column: 'location_city' },
      { name: 'artists', column: 'location_city' },
      { name: 'polls', column: 'location_city' },
    ]

    const nullCoordsStats: Record<
      string,
      { total: number; with_city: number; needs_geocoding: number; without_city: number }
    > = {}

    for (const table of tablesToCheck) {
      const { count: totalCount } = await supabase
        .from(table.name)
        .select('*', { count: 'exact', head: true })

      const { count: withCityCount } = await supabase
        .from(table.name)
        .select('*', { count: 'exact', head: true })
        .not(table.column, 'is', null)

      const { count: needsGeocodingCount } = await supabase
        .from(table.name)
        .select('*', { count: 'exact', head: true })
        .is('location_coordinates', null)
        .not(table.column, 'is', null)

      const { count: withoutCityCount } = await supabase
        .from(table.name)
        .select('*', { count: 'exact', head: true })
        .is(table.column, null)

      nullCoordsStats[table.name] = {
        total: totalCount || 0,
        with_city: withCityCount || 0,
        needs_geocoding: needsGeocodingCount || 0,
        without_city: withoutCityCount || 0,
      }
    }

    // Get recent geocoding queue items for monitoring
    const { data: recentQueueItems } = await supabase
      .from('geocoding_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    // Calculate success rate
    const totalAttempts = queueStats.completed + queueStats.failed
    const successRate =
      totalAttempts > 0 ? ((queueStats.completed / totalAttempts) * 100).toFixed(2) : '0'

    const stats = {
      queue: {
        pending: queueStats.pending,
        processing: queueStats.processing,
        completed: queueStats.completed,
        failed: queueStats.failed,
        success_rate: `${successRate}%`,
        total_attempts: totalAttempts,
      },
      queue_by_table: queueStats.byTable,
      records_status: nullCoordsStats,
      recent_items: recentQueueItems || [],
      timestamp: new Date().toISOString(),
    }

    logger.info('Geocoding statistics fetched successfully')

    return createSuccessResponse(stats)
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/admin/geocoding/stats' })
  }
})
