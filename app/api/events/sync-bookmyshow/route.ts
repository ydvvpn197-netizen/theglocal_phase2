import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncBookMyShowEvents } from '@/lib/integrations/bookmyshow'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

// GET /api/events/sync-bookmyshow - Cron job to sync BookMyShow events
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  const logger = createAPILogger('GET', '/api/events/sync-bookmyshow')
  try {
    // Verify this is a cron job request (Vercel cron secret)
    const authHeader = _request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`

    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get list of cities with active communities
    const { data: communities } = await supabase
      .from('communities')
      .select('location_city')
      .limit(100)

    const cities = Array.from(
      new Set(communities?.map((c) => c.location_city) || ['Mumbai', 'Delhi'])
    )

    // Sync events
    const syncedCount = await syncBookMyShowEvents(cities)

    // logger.info(`Synced ${syncedCount} BookMyShow events across ${cities.length} cities`)

    return NextResponse.json({
      success: true,
      message: `Synced ${syncedCount} events`,
      data: {
        syncedCount,
        cities: cities.length,
      },
    })
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/events/sync-bookmyshow' })
  }
})
