import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'

// GET /api/events/sources - Get distinct sources from events
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  const logger = createAPILogger('GET', '/api/events/sources')
  try {
    const supabase = await createClient()

    // Fetch distinct sources from events table
    // Only include events that are active (not expired)
    const { data, error } = await supabase
      .from('events')
      .select('source_platform')
      .gte('event_date', new Date().toISOString())
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
      .not('source_platform', 'is', null)
      .order('source_platform', { ascending: true })

    if (error) {
      throw error
    }

    // Extract unique sources
    const sources = Array.from(
      new Set((data || []).map((event) => event.source_platform).filter(Boolean))
    ).sort()

    return createSuccessResponse(sources)
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/events/sources' })
  }
})
