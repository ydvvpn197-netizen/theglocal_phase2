import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CONTENT_LIMITS } from '@/lib/utils/constants'

// GET /api/bookings/[id]/messages - List messages for a booking
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify user has access to this booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('user_id, artists!bookings_artist_id_fkey(user_id)')
      .eq('id', params.id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const isBookingOwner = booking.user_id === user.id
    const isArtist = booking.artists?.user_id === user.id

    if (!isBookingOwner && !isArtist) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Fetch messages
    const { data: messages, error: messagesError } = await supabase
      .from('booking_messages')
      .select('*')
      .eq('booking_id', params.id)
      .order('created_at', { ascending: true })

    if (messagesError) throw messagesError

    return NextResponse.json({
      success: true,
      data: messages || [],
      meta: {
        is_artist: isArtist,
      },
    })
  } catch (error) {
    console.error('Fetch messages error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch messages',
      },
      { status: 500 }
    )
  }
}

// POST /api/bookings/[id]/messages - Send a message
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { message } = body

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (message.length > CONTENT_LIMITS.BOOKING_MESSAGE_MAX) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify user has access to this booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('user_id, artist_id, artists!bookings_artist_id_fkey(user_id)')
      .eq('id', params.id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const isBookingOwner = booking.user_id === user.id
    const isArtist = booking.artists?.user_id === user.id

    if (!isBookingOwner && !isArtist) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
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
      console.error('Database error creating message:', createError)
      throw createError
    }

    // TODO: Task 4.4.12 - Send notification to the other party

    return NextResponse.json(
      {
        success: true,
        message: 'Message sent successfully',
        data: newMessage,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create message error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to send message',
      },
      { status: 500 }
    )
  }
}

