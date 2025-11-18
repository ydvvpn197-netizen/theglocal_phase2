import { NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { CONTENT_LIMITS } from '@/lib/utils/constants'
import { createNotification } from '@/lib/utils/notifications'
import { handleAPIError, createSuccessResponse, APIErrors } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

// GET /api/bookings/[id]/messages - List messages for a booking
export const GET = withRateLimit(async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const logger = createAPILogger('GET', '/api/bookings/[id]/messages')
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    // Verify user has access to this booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('user_id, artists!bookings_artist_id_fkey(user_id)')
      .eq('id', params.id)
      .single()

    if (bookingError || !booking) {
      throw APIErrors.notFound('Booking')
    }

    const isBookingOwner = booking.user_id === user.id
    const artists = booking.artists as { user_id?: string }[] | undefined
    const isArtist = Array.isArray(artists) && artists[0]?.user_id === user.id

    if (!isBookingOwner && !isArtist) {
      throw APIErrors.forbidden()
    }

    // Fetch messages
    const { data: messages, error: messagesError } = await supabase
      .from('booking_messages')
      .select('*')
      .eq('booking_id', params.id)
      .order('created_at', { ascending: true })

    if (messagesError) throw messagesError

    return createSuccessResponse(messages || [], {
      is_artist: isArtist,
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'GET',
      path: `/api/bookings/${params.id}/messages`,
    })
  }
})

// POST /api/bookings/[id]/messages - Send a message
export const POST = withRateLimit(async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const logger = createAPILogger('POST', '/api/bookings/[id]/messages')
  try {
    const body = await request.json()
    const { message } = body

    if (!message || message.trim().length === 0) {
      throw APIErrors.badRequest('Message is required')
    }

    if (message.length > CONTENT_LIMITS.BOOKING_MESSAGE_MAX) {
      throw APIErrors.badRequest('Message too long')
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw APIErrors.unauthorized()
    }

    // Verify user has access to this booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('user_id, artist_id, artists!bookings_artist_id_fkey(user_id, stage_name)')
      .eq('id', params.id)
      .single()

    if (bookingError || !booking) {
      throw APIErrors.notFound('Booking')
    }

    const isBookingOwner = booking.user_id === user.id
    const artists = booking.artists as { user_id?: string }[] | undefined
    const isArtist = Array.isArray(artists) && artists[0]?.user_id === user.id

    if (!isBookingOwner && !isArtist) {
      throw APIErrors.forbidden()
    }

    // Create message
    const { data: newMessage, error: createError } = await supabase
      .from('booking_messages')
      .insert({
        booking_id: params.id,
        sender_id: user.id,
        message: message.trim(),
        is_from_artist: isArtist,
      })
      .select()
      .single()

    if (createError) {
      logger.error('Database error creating message:', createError)
      throw createError
    }

    // Send notification to the other party
    try {
      const adminSupabase = createAdminClient()

      // Determine recipient and actor name
      let recipientUserId: string | null = null
      let actorName: string

      if (isArtist) {
        // Artist sent message, notify booking owner
        recipientUserId = booking.user_id
        const artist = booking.artists as { stage_name?: string } | undefined
        actorName = artist?.stage_name || 'The artist'
      } else {
        // User sent message, notify artist
        const artist = booking.artists as { user_id?: string; stage_name?: string } | undefined
        recipientUserId = artist?.user_id || null

        // Get user's anonymous handle
        const { data: senderUser } = await supabase
          .from('users')
          .select('anonymous_handle')
          .eq('id', user.id)
          .single()

        actorName = senderUser?.anonymous_handle || 'A user'
      }

      if (recipientUserId) {
        // Truncate message preview for notification
        const messagePreview =
          message.trim().length > 50 ? message.trim().substring(0, 50) + '...' : message.trim()

        await createNotification(adminSupabase, {
          userId: recipientUserId,
          type: 'booking_message',
          title: 'New booking message',
          message: `${actorName}: ${messagePreview}`,
          link: `/bookings/${params.id}?tab=messages`,
          actorId: user.id,
          entityId: params.id,
          entityType: 'booking',
        })
      }
    } catch (error) {
      // Log notification error but don't fail the request
      logger.warn('Failed to send notification', { error })
    }

    return createSuccessResponse(newMessage, {
      message: 'Message sent successfully',
    })
  } catch (error) {
    return handleAPIError(error, {
      method: 'POST',
      path: `/api/bookings/${params.id}/messages`,
    })
  }
})
