import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'

// GET /api/events/cities - Get distinct cities from events
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  const logger = createAPILogger('GET', '/api/events/cities')
  try {
    const supabase = await createClient()

    // Fetch distinct cities from events table
    // Only include events that are active (not expired)
    const { data, error } = await supabase
      .from('events')
      .select('location_city')
      .gte('event_date', new Date().toISOString())
      .gt('expires_at', new Date().toISOString())
      .not('location_city', 'is', null)
      .order('location_city', { ascending: true })

    if (error) {
      throw error
    }

    // Extract unique cities
    const cities = Array.from(
      new Set((data || []).map((event) => event.location_city).filter(Boolean))
    ).sort()

    return createSuccessResponse(cities)
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/events/cities' })
  }
})
