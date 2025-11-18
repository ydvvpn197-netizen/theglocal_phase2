import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAPILogger } from '@/lib/utils/logger-context'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

/**
 * GET /api/events/[id] - Get event details
 *
 * @param _request - Next.js request
 * @param params - Route parameters with event ID
 * @returns Event data
 */
export const GET = withRateLimit(async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: eventId } = params
  const logger = createAPILogger('GET', `/api/events/${eventId}`)

  try {
    logger.info('Fetching event', { eventId })

    const supabase = await createClient()

    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (error) throw error

    if (!event) {
      throw APIErrors.notFound('Event')
    }

    logger.info('Event fetched successfully', { eventId })

    return createSuccessResponse(event)
  } catch (error) {
    return handleAPIError(error, {
      method: 'GET',
      path: `/api/events/${eventId}`,
    })
  }
})

/**
 * PUT /api/events/[id] - Update event (artist only)
 *
 * @param request - Next.js request with updated event data
 * @param params - Route parameters with event ID
 * @returns Updated event
 */
export const PUT = withRateLimit(async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: eventId } = params
  const logger = createAPILogger('PUT', `/api/events/${eventId}`)

  try {
    const body = await request.json()
    const {
      title,
      description,
      event_date,
      location_city,
      location_address,
      category,
      ticket_info,
    } = body

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    logger.info('Updating event', { eventId, userId: user.id })

    // Get event and verify ownership
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('artist_id')
      .eq('id', params.id)
      .single()

    if (eventError || !event) {
      throw APIErrors.notFound('Event')
    }

    // Verify user owns this event
    const { data: artist } = await supabase
      .from('artists')
      .select('id, subscription_status')
      .eq('user_id', user.id)
      .eq('id', event.artist_id)
      .single()

    if (!artist) {
      throw APIErrors.forbidden()
    }

    // Check subscription status
    if (!['trial', 'active'].includes(artist.subscription_status)) {
      throw APIErrors.forbidden()
    }

    // Validate event date is in the future (if provided)
    if (event_date) {
      const eventDate = new Date(event_date)
      if (eventDate <= new Date()) {
        throw APIErrors.badRequest('Event date must be in the future')
      }
    }

    // Update event
    interface EventUpdateData {
      title?: string
      description?: string
      event_date?: string
      location_city?: string
      location_address?: string
      category?: string
      ticket_info?: Record<string, unknown>
    }

    const updateData: EventUpdateData = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (event_date !== undefined) updateData.event_date = event_date
    if (location_city !== undefined) updateData.location_city = location_city
    if (location_address !== undefined) updateData.location_address = location_address
    if (category !== undefined) updateData.category = category
    if (ticket_info !== undefined) updateData.ticket_info = ticket_info

    const { data: updatedEvent, error: updateError } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) throw updateError

    logger.info('Event updated successfully', { eventId, userId: user.id })

    return createSuccessResponse(updatedEvent, {
      message: 'Event updated successfully',
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'PUT',
      path: `/api/events/${eventId}`,
    })
  }
})

/**
 * DELETE /api/events/[id] - Delete event (artist only)
 *
 * @param _request - Next.js request
 * @param params - Route parameters with event ID
 * @returns Success response
 */
export const DELETE = withRateLimit(async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: eventId } = params
  const logger = createAPILogger('DELETE', `/api/events/${eventId}`)

  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    logger.info('Deleting event', { eventId, userId: user.id })

    // Get event and verify ownership
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('artist_id')
      .eq('id', params.id)
      .single()

    if (eventError || !event) {
      throw APIErrors.notFound('Event')
    }

    // Verify user owns this event
    const { data: artist } = await supabase
      .from('artists')
      .select('id')
      .eq('user_id', user.id)
      .eq('id', event.artist_id)
      .single()

    if (!artist) {
      throw APIErrors.forbidden()
    }

    // Delete event
    const { error: deleteError } = await supabase.from('events').delete().eq('id', params.id)

    if (deleteError) throw deleteError

    logger.info('Event deleted successfully', { eventId, userId: user.id })

    return createSuccessResponse(null, {
      message: 'Event deleted successfully',
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'DELETE',
      path: `/api/events/${eventId}`,
    })
  }
})
