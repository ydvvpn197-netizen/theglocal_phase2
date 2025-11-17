import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAPILogger } from '@/lib/utils/logger-context'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

/**
 * POST /api/events/[id]/rsvp - RSVP to an event
 *
 * @param _request - Next.js request
 * @param params - Route parameters with event ID
 * @returns RSVP confirmation with count
 */
export const POST = withRateLimit(async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: eventId } = params
  const logger = createAPILogger('POST', `/api/events/${eventId}/rsvp`)

  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    logger.info('Processing RSVP', { eventId, userId: user.id })

    // Check if event exists
    const { data: event } = await supabase
      .from('events')
      .select('id, event_date')
      .eq('id', eventId)
      .single()

    if (!event) {
      throw APIErrors.notFound('Event')
    }

    // Check if event is in the future
    if (new Date(event.event_date) < new Date()) {
      throw APIErrors.badRequest('Cannot RSVP to past events')
    }

    // Check if user already RSVP'd
    const { data: existingRsvp } = await supabase
      .from('event_rsvps')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .single()

    if (existingRsvp) {
      throw APIErrors.badRequest("You have already RSVP'd to this event")
    }

    // Create RSVP
    const { error: rsvpError } = await supabase.from('event_rsvps').insert({
      event_id: eventId,
      user_id: user.id,
    })

    if (rsvpError) throw rsvpError

    // Get updated RSVP count
    const { count } = await supabase
      .from('event_rsvps')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)

    logger.info('RSVP confirmed successfully', {
      eventId,
      userId: user.id,
      rsvpCount: count || 1,
    })

    return createSuccessResponse(
      {
        rsvp_count: count || 1,
      },
      {
        message: 'RSVP confirmed',
      }
    )
  } catch (error) {
    return handleAPIError(error, {
      method: 'POST',
      path: `/api/events/${eventId}/rsvp`,
    })
  }
})
