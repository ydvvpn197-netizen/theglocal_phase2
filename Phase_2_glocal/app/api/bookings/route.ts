import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { BOOKING_STATUSES } from '@/lib/utils/constants'
import { createNotification } from '@/lib/utils/notifications'
import { handleAPIError } from '@/lib/utils/api-response'
import { createAPILogger } from '@/lib/utils/logger-context'
import { withRateLimit } from '@/lib/middleware/with-rate-limit'

// GET /api/bookings - List bookings for current user
export const GET = withRateLimit(async function GET(request: NextRequest) {
  const logger = createAPILogger('GET', '/api/bookings')
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if user is an artist
    const { data: artist } = await supabase
      .from('artists')
      .select('id')
      .eq('user_id', user.id)
      .single()

    let query

    if (artist) {
      // Artist: show bookings for their services
      query = supabase
        .from('bookings')
        .select('*, users!bookings_user_id_fkey(anonymous_handle)')
        .eq('artist_id', artist.id)
    } else {
      // Regular user: show their booking requests
      query = supabase
        .from('bookings')
        .select('*, artists(id, stage_name, service_category)')
        .eq('user_id', user.id)
    }

    if (status && BOOKING_STATUSES.includes(status as (typeof BOOKING_STATUSES)[number])) {
      query = query.eq('status', status)
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

    const { data: bookings, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: bookings || [],
      meta: {
        is_artist: !!artist,
        status,
        limit,
        offset,
      },
    })
  } catch (error) {
    return handleAPIError(error, { method: 'GET', path: '/api/bookings' })
  }
})
// POST /api/bookings - Create booking request
export const POST = withRateLimit(async function POST(request: NextRequest) {
  const logger = createAPILogger('POST', '/api/bookings')
  try {
    const body = await request.json()
    const { artist_id, event_date, event_type, location, budget_range, message } = body

    if (!artist_id || !event_date || !event_type || !location) {
      return NextResponse.json(
        { error: 'artist_id, event_date, event_type, and location are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify artist exists and has active subscription
    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select('id, stage_name, subscription_status, user_id')
      .eq('id', artist_id)
      .single()

    if (artistError || !artist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 })
    }

    if (!['trial', 'active'].includes(artist.subscription_status)) {
      return NextResponse.json(
        { error: 'This artist is not currently accepting bookings' },
        { status: 400 }
      )
    }

    // Validate event date is in the future
    const eventDate = new Date(event_date)
    if (eventDate <= new Date()) {
      return NextResponse.json({ error: 'Event date must be in the future' }, { status: 400 })
    }

    // Check if user is trying to book themselves
    const { data: userArtist } = await supabase
      .from('artists')
      .select('id')
      .eq('user_id', user.id)
      .eq('id', artist_id)
      .single()

    if (userArtist) {
      return NextResponse.json({ error: 'You cannot book yourself' }, { status: 400 })
    }

    // Create booking
    const { data: booking, error: createError } = await supabase
      .from('bookings')
      .insert({
        user_id: user.id,
        artist_id,
        event_date,
        event_type,
        location,
        budget_range,
        message,
        status: 'pending',
      })
      .select()
      .single()

    if (createError) {
      logger.error('Database error creating booking:', createError)
      throw createError
    }

    // Send notification to artist
    try {
      const adminSupabase = createAdminClient()
      if (artist?.user_id) {
        await createNotification(adminSupabase, {
          userId: artist.user_id,
          type: 'booking_request',
          title: 'New booking request',
          message: `You have a new booking request for ${event_type}`,
          link: `/bookings/${booking.id}`,
          actorId: user.id,
          entityId: booking.id,
          entityType: 'booking',
        })
      }
    } catch (error) {
      return handleAPIError(error, { method: 'POST', path: '/api/bookings' })
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Booking request created successfully',
        data: booking,
      },
      { status: 201 }
    )
  } catch (error) {
    return handleAPIError(error, {
      method: 'POST',
      path: '/api/bookings',
    })
  }
})
