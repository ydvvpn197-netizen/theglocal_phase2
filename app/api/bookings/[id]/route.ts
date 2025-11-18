import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { BOOKING_STATUSES } from '@/lib/utils/constants'
import { createNotification, getNotificationMessage } from '@/lib/utils/notifications'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

// GET /api/bookings/[id] - Get booking details
export const GET = withRateLimit(async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const logger = createAPILogger('GET', '/api/bookings/[id]')
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Fetch booking with related data
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(
        `
        *,
        artists!bookings_artist_id_fkey(id, stage_name, service_category, user_id),
        users!bookings_user_id_fkey(anonymous_handle)
      `
      )
      .eq('id', params.id)
      .single()

    if (error) throw error

    if (!booking) {
      throw APIErrors.notFound('Booking')
    }

    // Verify user has access to this booking
    const isBookingOwner = booking.user_id === user.id
    const isArtist = booking.artists?.user_id === user.id

    if (!isBookingOwner && !isArtist) {
      throw APIErrors.forbidden()
    }

    return createSuccessResponse(booking, {
      is_artist: isArtist,
      is_booking_owner: isBookingOwner,
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'GET',
      path: `/api/bookings/${params.id}`,
    })
  }
})

// PUT /api/bookings/[id] - Update booking status (artist only)
export const PUT = withRateLimit(async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const logger = createAPILogger('PUT', '/api/bookings/[id]')
  try {
    const body = await request.json()
    const { status } = body

    if (!status || !BOOKING_STATUSES.includes(status)) {
      throw APIErrors.badRequest('Valid status is required')
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    // Get booking and verify artist ownership
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, artists!bookings_artist_id_fkey(user_id, stage_name)')
      .eq('id', params.id)
      .single()

    if (bookingError || !booking) {
      throw APIErrors.notFound('Booking')
    }

    // Verify user is the artist for this booking
    if (booking.artists?.user_id !== user.id) {
      throw APIErrors.forbidden()
    }

    // Update booking status
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) throw updateError

    // Send notification to booking owner about status change
    try {
      const adminSupabase = createAdminClient()
      const artist = booking.artists as { stage_name?: string } | undefined
      const artistName = artist?.stage_name || 'the artist'

      const notificationMessage = getNotificationMessage('booking_update', {
        artistName,
        status,
      })

      await createNotification(adminSupabase, {
        userId: booking.user_id,
        type: 'booking_update',
        title: notificationMessage.title,
        message: notificationMessage.message,
        link: `/bookings/${params.id}`,
        actorId: user.id,
        entityId: params.id,
        entityType: 'booking',
      })
    } catch (error) {
      // Log notification error but don't fail the request
      logger.warn('Failed to send notification', { error })
    }

    return createSuccessResponse(updatedBooking, {
      message: 'Booking status updated successfully',
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'PUT',
      path: `/api/bookings/${params.id}`,
    })
  }
})

// DELETE /api/bookings/[id] - Cancel booking (booking owner only)
export const DELETE = withRateLimit(async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const logger = createAPILogger('DELETE', '/api/bookings/[id]')
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    // Get booking and verify ownership
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('user_id, status')
      .eq('id', params.id)
      .single()

    if (bookingError || !booking) {
      throw APIErrors.notFound('Booking')
    }

    // Verify user owns this booking
    if (booking.user_id !== user.id) {
      throw APIErrors.forbidden()
    }

    // Can only cancel pending or info_requested bookings
    if (!['pending', 'info_requested'].includes(booking.status)) {
      throw APIErrors.badRequest('Can only cancel pending or info requested bookings')
    }

    // Update to declined status (soft delete)
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'declined' })
      .eq('id', params.id)

    if (updateError) throw updateError

    return createSuccessResponse(null, {
      message: 'Booking cancelled successfully',
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'DELETE',
      path: `/api/bookings/${params.id}`,
    })
  }
})
