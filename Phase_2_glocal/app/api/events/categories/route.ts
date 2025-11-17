import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const dynamic = 'force-dynamic'

// GET /api/events/categories - Get distinct categories from events
export const GET = withRateLimit(async function GET(_request: NextRequest) {
  const logger = createAPILogger('GET', '/api/events/categories')
  try {
    const supabase = await createClient()

    // Fetch distinct categories from events table
    // Only include events that are active (not expired)
    const { data, error } = await supabase
      .from('events')
      .select('category')
      .gte('event_date', new Date().toISOString())
      .gt('expires_at', new Date().toISOString())
      .not('category', 'is', null)
      .order('category', { ascending: true })

    if (error) {
      throw error
    }

    // Extract unique categories
    const categories = Array.from(
      new Set((data || []).map((event) => event.category).filter(Boolean))
    ).sort()

    return createSuccessResponse(categories)
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/events/categories' })
  }
})
