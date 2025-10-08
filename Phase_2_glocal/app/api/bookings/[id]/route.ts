import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BOOKING_STATUSES } from '@/lib/utils/constants'

// GET /api/bookings/[id] - Get booking details
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
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Verify user has access to this booking
    const isBookingOwner = booking.user_id === user.id
    const isArtist = booking.artists?.user_id === user.id

    if (!isBookingOwner && !isArtist) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      data: booking,
      meta: {
        is_artist: isArtist,
        is_booking_owner: isBookingOwner,
      },
    })
  } catch (error) {
    console.error('Fetch booking error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch booking',
      },
      { status: 500 }
    )
  }
}

// PUT /api/bookings/[id] - Update booking status (artist only)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { status } = body

    if (!status || !BOOKING_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Valid status is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get booking and verify artist ownership
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, artists!bookings_artist_id_fkey(user_id)')
      .eq('id', params.id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Verify user is the artist for this booking
    if (booking.artists?.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the artist can update booking status' },
        { status: 403 }
      )
    }

    // Update booking status
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) throw updateError

    // TODO: Task 4.4.12 - Send notification to booking owner about status change

    return NextResponse.json({
      success: true,
      message: 'Booking status updated successfully',
      data: updatedBooking,
    })
  } catch (error) {
    console.error('Update booking error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update booking',
      },
      { status: 500 }
    )
  }
}

// DELETE /api/bookings/[id] - Cancel booking (booking owner only)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get booking and verify ownership
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('user_id, status')
      .eq('id', params.id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Verify user owns this booking
    if (booking.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the booking owner can cancel the booking' },
        { status: 403 }
      )
    }

    // Can only cancel pending or info_requested bookings
    if (!['pending', 'info_requested'].includes(booking.status)) {
      return NextResponse.json(
        { error: 'Can only cancel pending or info requested bookings' },
        { status: 400 }
      )
    }

    // Update to declined status (soft delete)
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'declined' })
      .eq('id', params.id)

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      message: 'Booking cancelled successfully',
    })
  } catch (error) {
    console.error('Cancel booking error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to cancel booking',
      },
      { status: 500 }
    )
  }
}

