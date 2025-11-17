import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { protectCronRoute } from '@/lib/utils/cron-auth'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

/**
 * GET /api/events/cleanup-duplicates - Cron job to clean up duplicate events
 *
 * This endpoint is called by Vercel Cron hourly
 * Removes duplicate events based on: title + event_date + location_city + source_platform
 * Keeps the newest entry (latest created_at) in each duplicate group
 * Requires CRON_SECRET for authentication
 */
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  const logger = createAPILogger('GET', '/api/events/cleanup-duplicates')
  try {
    // Verify cron authentication
    const authError = protectCronRoute(_request)
    if (authError) return authError

    logger.info('Starting automatic duplicate events cleanup')
    const startTime = Date.now()

    // Run duplicate cleanup
    const result = await cleanupDuplicateEvents()

    const duration = Date.now() - startTime

    logger.info('Duplicate cleanup complete', { removed: result.removed, duration })

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${result.removed} duplicate events, kept ${result.kept} unique events`,
      data: {
        duplicateGroupsFound: result.duplicateGroups,
        duplicatesRemoved: result.removed,
        uniqueEventsKept: result.kept,
        duration,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/events/cleanup-duplicates' })
  }
})

/**
 * POST /api/events/cleanup-duplicates - Manual cleanup trigger (for testing/admin)
 */
export const POST = withRateLimit(async function POST(_request: NextRequest) {
  const logger = createAPILogger('POST', '/api/events/cleanup-duplicates')
  try {
    // TODO: Add admin authentication
    logger.info('Manual duplicate cleanup triggered')

    const result = await cleanupDuplicateEvents()

    return NextResponse.json({
      success: true,
      message: `Manually cleaned up ${result.removed} duplicate events`,
      data: {
        duplicateGroupsFound: result.duplicateGroups,
        duplicatesRemoved: result.removed,
        uniqueEventsKept: result.kept,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return handleAPIError(error, { method: 'POST', path: '/api/events/cleanup-duplicates' })
  }
})

/**
 * Cleanup duplicate events from the database
 * Keeps the newest entry (latest created_at) for each duplicate group
 */
async function cleanupDuplicateEvents(): Promise<{
  duplicateGroups: number
  removed: number
  kept: number
}> {
  const logger = createAPILogger('GET', '/api/events/cleanup-duplicates')
  const supabase = createAdminClient()

  // Get all events
  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, event_date, location_city, source_platform, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch events: ${error.message}`)
  }

  if (!events || events.length === 0) {
    return { duplicateGroups: 0, removed: 0, kept: 0 }
  }

  logger.info('Analyzing events for duplicates', { count: events.length })

  // Group events by title, date, city, and platform
  const groups = new Map<string, typeof events>()

  for (const event of events) {
    // Normalize for grouping
    const normalizedTitle = event.title.toLowerCase().trim()
    const dateOnly = event.event_date.split('T')[0] // Get YYYY-MM-DD
    const normalizedCity = (event.location_city || '').toLowerCase().trim()
    const platform = event.source_platform || 'unknown'

    const key = `${platform}::${normalizedTitle}::${dateOnly}::${normalizedCity}`

    if (!groups.has(key)) {
      groups.set(key, [])
    }

    groups.get(key)!.push(event)
  }

  // Filter to only duplicates (count > 1)
  const duplicateGroups = Array.from(groups.values()).filter((group) => group.length > 1)

  logger.info('Found duplicate groups', { count: duplicateGroups.length })

  if (duplicateGroups.length === 0) {
    return { duplicateGroups: 0, removed: 0, kept: 0 }
  }

  let totalRemoved = 0
  let totalKept = 0

  // Process each duplicate group
  for (const group of duplicateGroups) {
    // Sort by created_at to find newest (already sorted DESC from query, so first is newest)
    const toKeep = group[0]
    if (!toKeep) continue

    const toRemove = group.slice(1)

    totalKept++
    totalRemoved += toRemove.length

    // Delete the older duplicates
    const idsToDelete = toRemove.map((e) => e.id)

    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabase.from('events').delete().in('id', idsToDelete)

      if (deleteError) {
        logger.error('Error removing duplicates', undefined, {
          title: toKeep.title,
          error: deleteError.message,
        })
      } else {
        logger.info('Removed duplicates', {
          count: toRemove.length,
          title: toKeep.title,
          city: toKeep.location_city,
        })
      }
    }
  }

  return {
    duplicateGroups: duplicateGroups.length,
    removed: totalRemoved,
    kept: totalKept,
  }
}
