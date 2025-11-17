import { NextRequest, NextResponse } from 'next/server'
import { requireAdminOrThrow } from '@/lib/utils/require-admin'
import { getCacheStats, clearCache } from '@/lib/utils/query-cache'
import { handleAPIError, createSuccessResponse } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'

// GET /api/admin/performance - Get performance statistics
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  const logger = createAPILogger('GET', '/api/admin/performance')
  try {
    // Require admin authentication
    const { supabase } = await requireAdminOrThrow()

    logger.info('📊 Fetching performance statistics')

    // Get cache statistics
    const cacheStats = getCacheStats()

    // Get database query performance (placeholder - would use pg_stat_statements in production)
    const { data: dbStats, error: dbError } = await supabase.rpc('get_query_performance_stats')

    if (dbError) {
      logger.warn('Failed to get DB performance stats', { error: dbError })
    }

    const dbStatsData = (dbStats as Array<{ error_message?: string; event_type?: string }>) || []

    // Get system resource usage (basic metrics)
    const memoryUsage = process.memoryUsage()
    const uptime = process.uptime()

    // Get recent system logs
    const { data: recentLogs } = await supabase
      .from('system_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    const recentLogsData =
      (recentLogs as Array<{ error_message?: string; event_type?: string }>) || []

    // Calculate some basic performance metrics
    const performanceMetrics = {
      cache: {
        ...cacheStats,
        hitRate:
          cacheStats.totalHits > 0
            ? (
                (cacheStats.totalHits / (cacheStats.totalEntries + cacheStats.totalHits)) *
                100
              ).toFixed(2) + '%'
            : '0%',
      },
      database: {
        queryStats: dbStatsData,
        connectionPool: {
          // Placeholder for connection pool stats
          active: 'N/A',
          idle: 'N/A',
          waiting: 'N/A',
        },
      },
      system: {
        memoryUsage: {
          rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
          heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
          heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
          external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`,
        },
        uptime: `${(uptime / 3600).toFixed(2)} hours`,
        nodeVersion: process.version,
      },
      logs: {
        recent: recentLogsData,
        summary: {
          errors: recentLogsData.filter((log) => log.error_message).length,
          cacheRefresh: recentLogsData.filter((log) => log.event_type === 'cache_refresh').length,
          totalEvents: recentLogsData.length,
        },
      },
    }

    return createSuccessResponse(performanceMetrics)
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/admin/performance' })
  }
})
// POST /api/admin/performance - Perform administrative actions
export const POST = withRateLimit(async function POST(_request: NextRequest) {
  const logger = createAPILogger('POST', '/api/admin/performance')
  try {
    // Require admin authentication
    const { user, supabase } = await requireAdminOrThrow()

    const body = await _request.json()
    const { action } = body

    logger.info(`🔧 Admin action requested: ${action}`)

    let result: { message: string } = { message: '' }

    switch (action) {
      case 'clear_cache':
        clearCache()
        result = { message: 'Cache cleared successfully' }

        // Log the action
        await supabase.from('system_logs').insert({
          event_type: 'admin_action',
          details: `Cache cleared by user ${user.id}`,
        })
        break

      case 'refresh_materialized_views':
        try {
          const { error: refreshError } = await supabase.rpc('refresh_popular_posts_cache')

          if (refreshError) throw refreshError

          result = { message: 'Materialized views refreshed successfully' }

          // Log the action
          await supabase.from('system_logs').insert({
            event_type: 'admin_action',
            details: `Materialized views refreshed by user ${user.id}`,
          })
        } catch (error) {
          return handleAPIError(error, { method: 'POST', path: '/api/admin/performance' })
        }
        break

      case 'analyze_tables':
        // In a real application, you'd run ANALYZE on important tables
        result = { message: 'Table analysis completed (placeholder)' }

        await supabase.from('system_logs').insert({
          event_type: 'admin_action',
          details: `Table analysis performed by user ${user.id}`,
        })
        break

      case 'vacuum_tables':
        // In a real application, you'd run VACUUM on tables
        result = { message: 'Table vacuum completed (placeholder)' }

        await supabase.from('system_logs').insert({
          event_type: 'admin_action',
          details: `Table vacuum performed by user ${user.id}`,
        })
        break

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }

    logger.info(`✅ Admin action completed: ${action}`)

    return createSuccessResponse(result)
  } catch (error) {
    return handleAPIError(error, {
      method: 'POST',
      path: '/api/admin/performance',
    })
  }
})
