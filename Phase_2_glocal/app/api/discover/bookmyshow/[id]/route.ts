import { NextRequest } from 'next/server'
import { fetchBookMyShowEvents } from '@/lib/integrations/bookmyshow'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

export const GET = withRateLimit(async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const logger = createAPILogger('GET', '/api/discover/bookmyshow/[id]')
  try {
    const { id } = await params
    const eventId = id

    // Fetch recent BookMyShow events and find the matching event
    const bmsEvents = await fetchBookMyShowEvents('India', 'all', 50) // Fetch more to find the event

    // Find the event by ID or by title hash
    const event = bmsEvents.find((event) => {
      // Try to match by ID first
      if (event.id === eventId) return true

      // If not found, try to match by title hash (for backward compatibility)
      const titleHash = event.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 10)
      return titleHash === eventId
    })

    if (!event) {
      throw APIErrors.notFound('BookMyShow event')
    }

    return createSuccessResponse(event)
  } catch (error) {
    const { id: errorEventId } = await params
    return handleAPIError(error, {
      method: 'GET',
      path: `/api/discover/bookmyshow/${errorEventId}`,
    })
  }
})
